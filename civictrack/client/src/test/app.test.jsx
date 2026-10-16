import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Pagination, StatusBadge, ConfirmDialog, EmptyState } from '../components/ui.jsx';
import { Timeline, ProgressSteps } from '../components/Timeline.jsx';
import { RequireRole } from '../components/Guards.jsx';
import { Login } from '../pages/public/AuthPages.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import * as apiModule from '../services/api.js';
import { formatHours, applyServerErrors } from '../utils/format.js';
import { TRANSITIONS } from '../utils/constants.js';

vi.mock('../services/api.js', async (orig) => {
  const real = await orig();
  return { ...real, get: vi.fn(), post: vi.fn(), patch: vi.fn() };
});

const wrap = (ui, path = '/') => render(<MemoryRouter initialEntries={[path]}><ToastProvider><AuthProvider>{ui}</AuthProvider></ToastProvider></MemoryRouter>);

beforeEach(() => vi.clearAllMocks());

describe('UI components', () => {
  it('renders status badges with readable labels', () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('paginates and disables boundary buttons', async () => {
    const onPage = vi.fn();
    render(<Pagination meta={{ page: 1, pages: 3, total: 25 }} onPage={onPage} />);
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    await userEvent.click(screen.getByLabelText('Next page'));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it('confirm dialog calls handlers and is a labelled modal', async () => {
    const onConfirm = vi.fn(); const onCancel = vi.fn();
    render(<ConfirmDialog open title="Delete it?" message="Sure?" confirmLabel="Delete" danger onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByRole('dialog', { name: 'Delete it?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows an empty state', () => {
    render(<EmptyState title="Nothing here">Try later</EmptyState>);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders the timeline in order with reasons', () => {
    render(<Timeline history={[{ to: 'submitted', at: '2026-01-01T00:00:00Z' }, { from: 'submitted', to: 'rejected', reason: 'Out of scope', actorName: 'Admin', at: '2026-01-02T00:00:00Z' }]} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Submitted');
    expect(items[1]).toHaveTextContent('Rejected');
    expect(items[1]).toHaveTextContent('Reason: Out of scope');
  });

  it('shows rejected state instead of progress steps', () => {
    render(<ProgressSteps status="rejected" />);
    expect(screen.getByText(/was rejected/)).toBeInTheDocument();
  });
});

describe('helpers', () => {
  it('formats durations', () => {
    expect(formatHours(null)).toBe('—');
    expect(formatHours(0.5)).toBe('30 min');
    expect(formatHours(6)).toBe('6 h');
    expect(formatHours(72)).toBe('3 days');
  });
  it('maps server validation details onto fields', () => {
    const setError = vi.fn();
    expect(applyServerErrors({ parsed: { details: { email: 'Taken', other: 'x' } } }, setError, ['email'])).toBe(true);
    expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'Taken' });
  });
  it('mirrors the workflow: resolved can only be reopened', () => {
    expect(TRANSITIONS.resolved).toEqual(['reopened']);
    expect(TRANSITIONS.submitted).not.toContain('resolved');
  });
});

describe('auth flows', () => {
  it('redirects unauthenticated visitors away from protected routes', async () => {
    apiModule.get.mockRejectedValue({ parsed: { status: 401 } });
    wrap(<Routes><Route element={<RequireRole roles={['admin']} />}><Route path="/admin" element={<p>secret</p>} /></Route><Route path="/login" element={<p>login page</p>} /></Routes>, '/admin');
    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('blocks a citizen from the admin area (redirected to their own home)', async () => {
    apiModule.get.mockResolvedValue({ data: { user: { id: '1', name: 'C', role: 'citizen' } } });
    wrap(<Routes><Route element={<RequireRole roles={['admin']} />}><Route path="/admin" element={<p>secret</p>} /></Route><Route path="/dashboard" element={<p>citizen home</p>} /></Routes>, '/admin');
    expect(await screen.findByText('citizen home')).toBeInTheDocument();
  });

  it('validates the login form before calling the API', async () => {
    apiModule.get.mockRejectedValue({ parsed: { status: 401 } });
    wrap(<Login />);
    await userEvent.click(await screen.findByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(apiModule.post).not.toHaveBeenCalled();
  });

  it('shows the server error on failed login', async () => {
    apiModule.get.mockRejectedValue({ parsed: { status: 401 } });
    apiModule.post.mockRejectedValue({ parsed: { message: 'Invalid email or password' } });
    wrap(<Login />);
    await userEvent.type(await screen.findByLabelText(/Email/), 'a@b.co');
    await userEvent.type(screen.getAllByLabelText(/Password/)[0], 'wrongpass1');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password'));
  });
});
