'use client';

import { useState, useSyncExternalStore, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  adjustDemoInventory,
  cancelDemoReservation,
  createDemoReservation,
  requestDemoReturn,
  updateDemoReservation,
} from '@/app/actions';
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CircleDot,
  Ellipsis,
  Minus,
  Moon,
  Package,
  Plus,
  Rows3,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Triangle,
  UserRound,
} from 'lucide-react';

export type CatalogItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  available: number;
  total: number;
  trackingMode: 'serialized' | 'bulk';
  requiresApproval: boolean;
  kind: 'ball' | 'cones';
  units: { id: string; assetTag: string }[];
};

type Mode = 'student' | 'staff' | 'admin';
type ReservationStatus = 'pending_approval' | 'approved' | 'checked_out' | 'return_requested';
type StaffAction = 'approve' | 'decline' | 'checkout' | 'confirm_return';
type Filter = 'all' | 'available' | 'unavailable';
type TrackingFilter = 'all' | 'serialized' | 'bulk';

export type CatalogRequest = {
  id: string;
  itemId: string;
  itemName: string;
  requestedBy: string;
  status: ReservationStatus;
  unitTag: string | null;
};

const modeDetails: Record<Mode, { label: string; user: string }> = {
  student: { label: 'Student', user: 'Alex Student' },
  staff: { label: 'Equipment Staff', user: 'Sam Staff' },
  admin: { label: 'Administrator', user: 'Taylor Admin' },
};

function subscribeToSettings(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener('gearup-settings-change', listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener('gearup-settings-change', listener);
  };
}

function getSavedTheme(): 'light' | 'dark' {
  return window.localStorage.getItem('gearup-theme') === 'dark' ? 'dark' : 'light';
}

function getSavedCompactMode() {
  return window.localStorage.getItem('gearup-compact') === 'true';
}

function getDefaultTheme(): 'light' | 'dark' {
  return 'light';
}

function getDefaultCompactMode() {
  return false;
}

function notifySettingsChanged() {
  window.dispatchEvent(new Event('gearup-settings-change'));
}

function statusLabel(status: ReservationStatus) {
  return {
    pending_approval: 'Waiting for approval',
    approved: 'Waiting for pickup',
    checked_out: 'Checked out',
    return_requested: 'Return awaiting confirmation',
  }[status];
}

function statusTone(status: ReservationStatus) {
  return {
    pending_approval: 'status-pending',
    approved: 'status-ready',
    checked_out: 'status-out',
    return_requested: 'status-return',
  }[status];
}

function OverflowMenu({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-control">
      <button
        aria-label={label}
        aria-expanded={open}
        className="more-button"
        onClick={onToggle}
        title={label}
        type="button"
      >
        <Ellipsis size={19} />
      </button>
      {open && <div className="overflow-menu">{children}</div>}
    </div>
  );
}

function RequestQueue({
  title,
  hint,
  requests,
  primaryAction,
  primaryLabel,
  primaryIcon,
  isPending,
  openMenuId,
  onToggleMenu,
  onPrimary,
  onDecline,
}: {
  title: string;
  hint: string;
  requests: CatalogRequest[];
  primaryAction?: StaffAction;
  primaryLabel?: string;
  primaryIcon?: React.ReactNode;
  isPending: boolean;
  openMenuId: string | null;
  onToggleMenu: (id: string) => void;
  onPrimary: (requestId: string, action: StaffAction) => void;
  onDecline: (requestId: string) => void;
}) {
  return (
    <section className="queue-section" aria-label={title}>
      <div className="queue-section-heading">
        <div><h3>{title}</h3><p>{hint}</p></div>
        <span className="queue-count">{requests.length}</span>
      </div>
      {requests.length === 0 ? (
        <p className="queue-empty">None right now</p>
      ) : (
        <div className="queue-list">
          {requests.map((request) => (
            <article className={`queue-row ${statusTone(request.status)}`} key={request.id}>
              <span className="row-symbol"><Package size={19} /></span>
              <div className="queue-row-info">
                <strong>{request.itemName}</strong>
                <span>{request.requestedBy}{request.unitTag ? ` · ${request.unitTag}` : ''}</span>
              </div>
              <span className={`status-label ${statusTone(request.status)}`}>
                {request.status === 'checked_out' ? <Package size={14} /> : <Clock3 size={14} />}
                {statusLabel(request.status)}
              </span>
              {primaryAction && primaryLabel ? (
                <button
                  className={`action-button ${primaryAction === 'decline' ? 'action-negative' : ''}`}
                  disabled={isPending}
                  onClick={() => onPrimary(request.id, primaryAction)}
                  type="button"
                >
                  {primaryIcon}{primaryLabel}
                </button>
              ) : <span className="queue-held-label">With borrower</span>}
              {(request.status === 'pending_approval' || request.status === 'approved') && (
                <OverflowMenu
                  label={`More options for ${request.itemName}`}
                  open={openMenuId === request.id}
                  onToggle={() => onToggleMenu(request.id)}
                >
                  <button className="menu-action menu-danger" disabled={isPending} onClick={() => onDecline(request.id)} type="button">
                    Decline request
                  </button>
                </OverflowMenu>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function GearUp({
  initialItems,
  initialRequests,
  initialStudentRequests,
  mutationsEnabled,
}: {
  initialItems: CatalogItem[];
  initialRequests: CatalogRequest[];
  initialStudentRequests: CatalogRequest[];
  mutationsEnabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>('student');
  const theme = useSyncExternalStore(subscribeToSettings, getSavedTheme, getDefaultTheme);
  const compactMode = useSyncExternalStore(subscribeToSettings, getSavedCompactMode, getDefaultCompactMode);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All gear');
  const [availabilityFilter, setAvailabilityFilter] = useState<Filter>('all');
  const [trackingFilter, setTrackingFilter] = useState<TrackingFilter>('all');
  const [notice, setNotice] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [unitPickerId, setUnitPickerId] = useState<string | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});

  function toggleTheme() {
    window.localStorage.setItem('gearup-theme', theme === 'dark' ? 'light' : 'dark');
    notifySettingsChanged();
  }

  function toggleCompactMode() {
    window.localStorage.setItem('gearup-compact', String(!compactMode));
    notifySettingsChanged();
  }

  function runAction(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      setNotice(result.message);
      setOpenMenuId(null);
      if (result.ok) router.refresh();
    });
  }

  function reserveItem(item: CatalogItem) {
    const unitId = selectedUnits[item.id];
    runAction(() => createDemoReservation(item.id, unitId));
  }

  function updateRequest(requestId: string, action: StaffAction) {
    runAction(() => updateDemoReservation(requestId, mode, action));
  }

  function cancelRequest(requestId: string) {
    runAction(() => cancelDemoReservation(requestId));
  }

  function requestReturn(requestId: string) {
    runAction(() => requestDemoReturn(requestId));
  }

  function adjustQuantity(itemId: string, amount: number) {
    runAction(() => adjustDemoInventory(itemId, amount));
  }

  const items = initialItems;
  const requests = initialRequests;
  const studentRequests = initialStudentRequests;
  const categories = ['All gear', ...new Set(items.map((item) => item.category))];
  const query = search.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    const matchesQuery = !query || `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query);
    const matchesCategory = category === 'All gear' || item.category === category;
    const matchesAvailability = availabilityFilter === 'all'
      || (availabilityFilter === 'available' ? item.available > 0 : item.available === 0);
    const matchesTracking = trackingFilter === 'all' || item.trackingMode === trackingFilter;
    return matchesQuery && matchesCategory && matchesAvailability && matchesTracking;
  });

  const pendingApproval = requests.filter((request) => request.status === 'pending_approval');
  const readyForPickup = requests.filter((request) => request.status === 'approved');
  const currentlyCheckedOut = requests.filter((request) => request.status === 'checked_out');
  const awaitingReturnConfirmation = requests.filter((request) => request.status === 'return_requested');
  const totalAvailable = items.reduce((sum, item) => sum + item.available, 0);
  const studentCheckedOut = studentRequests.filter((request) => request.status === 'checked_out').length;

  return (
    <div className={`gearup-shell ${compactMode ? 'compact-mode' : ''}`} data-theme={theme}>
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Trevecca GearUp home">
          <span className="brand-mark"><Package size={19} strokeWidth={2.2} /></span>
          <span className="brand-name">Gear<span>Up</span></span>
          <span className="brand-campus">TREVECCA</span>
        </Link>
        <div className="topbar-right">
          <div className="user-chip"><UserRound size={16} /><span>{modeDetails[mode].user}</span></div>
          <div className="settings-control">
            <button
              aria-label="Settings"
              aria-expanded={settingsOpen}
              aria-controls="gearup-settings"
              className="settings-button"
              onClick={() => setSettingsOpen((open) => !open)}
              title="Settings"
              type="button"
            >
              <Settings size={18} />
            </button>
            {settingsOpen && (
              <div className="settings-menu" id="gearup-settings" role="group" aria-label="Display settings">
                <p className="settings-title">Display settings</p>
                <button aria-checked={theme === 'dark'} className="setting-row" onClick={toggleTheme} role="switch" type="button">
                  <span className="setting-icon">{theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}</span>
                  <span className="setting-copy"><strong>Dark mode</strong><small>{theme === 'dark' ? 'On' : 'Off'}</small></span>
                  <span className={`switch-track ${theme === 'dark' ? 'switch-on' : ''}`}><span /></span>
                </button>
                <button aria-checked={compactMode} className="setting-row" onClick={toggleCompactMode} role="switch" type="button">
                  <span className="setting-icon"><Rows3 size={17} /></span>
                  <span className="setting-copy"><strong>Compact layout</strong><small>{compactMode ? 'On' : 'Off'}</small></span>
                  <span className={`switch-track ${compactMode ? 'switch-on' : ''}`}><span /></span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="gearup-main">
        <div className="welcome-line">
          <div>
            <p className="eyebrow">TREVECCA <span>·</span> CAMPUS EQUIPMENT</p>
            <h1>Good gear. <em>Good games.</em></h1>
            <p className="welcome-copy">Find what you need for your next run, match, or practice.</p>
          </div>
          <div className="availability-stamp"><Activity size={17} /><span><strong>{totalAvailable}</strong> available now</span></div>
        </div>

        <div className="mode-bar">
          <div className="mode-label"><ShieldCheck size={16} /> DEMO ROLE</div>
          <div className="mode-switch" role="group" aria-label="Choose demo role">
            {(['student', 'staff', 'admin'] as const).map((option) => (
              <button
                className={`mode-button ${mode === option ? 'mode-active' : ''}`}
                key={option}
                onClick={() => { setMode(option); setNotice(''); setOpenMenuId(null); }}
                type="button"
              >
                {modeDetails[option].label}
              </button>
            ))}
          </div>
          <p className="demo-warning">{mutationsEnabled ? 'Demo role selector · presentation only' : 'Preview mode · changes unavailable'}</p>
        </div>

        {notice && (
          <div className="notice" role="status">
            <CheckCircle2 size={16} />{notice}
            <button type="button" onClick={() => setNotice('')} aria-label="Dismiss notification">×</button>
          </div>
        )}

        {mode === 'staff' ? (
          <section className="workflow-section" aria-labelledby="queue-heading">
            <div className="section-heading">
              <div><p className="eyebrow">EQUIPMENT STAFF</p><h2 id="queue-heading">Checkout queue</h2></div>
              <span className="count-badge">{pendingApproval.length + readyForPickup.length} awaiting pickup</span>
            </div>
            <div className="queue-groups">
              <RequestQueue
                title="Needs approval"
                hint="Requests waiting for a decision"
                requests={pendingApproval}
                primaryAction="approve"
                primaryLabel="Approve"
                primaryIcon={<Check size={15} />}
                isPending={isPending}
                openMenuId={openMenuId}
                onToggleMenu={(id) => setOpenMenuId(openMenuId === id ? null : id)}
                onPrimary={updateRequest}
                onDecline={(id) => updateRequest(id, 'decline')}
              />
              <RequestQueue
                title="Ready for pickup"
                hint="Approved and not yet handed out"
                requests={readyForPickup}
                primaryAction="checkout"
                primaryLabel="Check out"
                primaryIcon={<ArrowDownToLine size={15} />}
                isPending={isPending}
                openMenuId={openMenuId}
                onToggleMenu={(id) => setOpenMenuId(openMenuId === id ? null : id)}
                onPrimary={updateRequest}
                onDecline={(id) => updateRequest(id, 'decline')}
              />
              <RequestQueue
                title="Currently checked out"
                hint="With a borrower; awaiting a return request"
                requests={currentlyCheckedOut}
                isPending={isPending}
                openMenuId={openMenuId}
                onToggleMenu={(id) => setOpenMenuId(openMenuId === id ? null : id)}
                onPrimary={updateRequest}
                onDecline={(id) => updateRequest(id, 'decline')}
              />
              <RequestQueue
                title="Return confirmation"
                hint="Borrower says the gear has been brought back"
                requests={awaitingReturnConfirmation}
                primaryAction="confirm_return"
                primaryLabel="Confirm return"
                primaryIcon={<Check size={15} />}
                isPending={isPending}
                openMenuId={openMenuId}
                onToggleMenu={(id) => setOpenMenuId(openMenuId === id ? null : id)}
                onPrimary={updateRequest}
                onDecline={(id) => updateRequest(id, 'decline')}
              />
            </div>
          </section>
        ) : mode === 'admin' ? (
          <section className="workflow-section" aria-labelledby="admin-heading">
            <div className="section-heading">
              <div><p className="eyebrow">INVENTORY CONTROL</p><h2 id="admin-heading">Manage equipment</h2></div>
              <span className="count-badge">{items.length} catalog items</span>
            </div>
            <div className="admin-list">
              {items.map((item) => (
                <article className="admin-row" key={item.id}>
                  <span className={`item-symbol symbol-${item.kind}`}>
                    {item.kind === 'ball' ? <CircleDot size={24} /> : <Triangle size={23} />}
                  </span>
                  <div className="admin-row-info"><strong>{item.name}</strong><span>{item.category}</span></div>
                  <span className="quantity-value">{item.available}<small> / {item.total}</small></span>
                  <div className="quantity-controls" aria-label={`Adjust ${item.name} demo quantity`}>
                    <button type="button" disabled={isPending || !mutationsEnabled} aria-label={`Remove one ${item.name}`} onClick={() => adjustQuantity(item.id, -1)}><Minus size={15} /></button>
                    <button type="button" disabled={isPending || !mutationsEnabled} aria-label={`Add one ${item.name}`} onClick={() => adjustQuantity(item.id, 1)}><Plus size={15} /></button>
                  </div>
                </article>
              ))}
              {items.length === 0 && <p className="empty-inline">No equipment in the catalog.</p>}
            </div>
          </section>
        ) : (
          <>
            <section className="catalog-section" aria-labelledby="catalog-heading">
              <div className="section-heading catalog-heading">
                <div><p className="eyebrow">READY WHEN YOU ARE</p><h2 id="catalog-heading">Browse equipment</h2></div>
                <label className="search-box">
                  <Search size={17} />
                  <input aria-label="Search equipment" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search gear" />
                </label>
              </div>

              <div className="catalog-filters">
                <div className="filter-line">
                  <span className="filter-label">Category</span>
                  <div className="category-tabs" role="group" aria-label="Filter by category">
                    {categories.map((option) => (
                      <button className={`category-tab ${category === option ? 'category-active' : ''}`} key={option} onClick={() => setCategory(option)} type="button">{option}</button>
                    ))}
                  </div>
                </div>
                <div className="filter-line">
                  <span className="filter-label">Availability</span>
                  <div className="filter-switch" role="group" aria-label="Filter by availability">
                    {(['all', 'available', 'unavailable'] as const).map((option) => (
                      <button className={availabilityFilter === option ? 'filter-active' : ''} key={option} onClick={() => setAvailabilityFilter(option)} type="button">
                        {option === 'all' ? 'Any' : option === 'available' ? 'In stock' : 'Unavailable'}
                      </button>
                    ))}
                  </div>
                  <span className="filter-label tracking-filter-label">Item type</span>
                  <div className="filter-switch" role="group" aria-label="Filter by item type">
                    {(['all', 'serialized', 'bulk'] as const).map((option) => (
                      <button className={trackingFilter === option ? 'filter-active' : ''} key={option} onClick={() => setTrackingFilter(option)} type="button">
                        {option === 'all' ? 'Any' : option === 'serialized' ? 'Tagged units' : 'Bulk sets'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="results-line"><span>{filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}</span><button className="clear-filters" type="button" onClick={() => { setSearch(''); setCategory('All gear'); setAvailabilityFilter('all'); setTrackingFilter('all'); }}>Clear filters</button></div>

              <div className="inventory-list">
                {filteredItems.map((item, index) => {
                  const activeRequest = studentRequests.find((request) => request.itemId === item.id);
                  const selectedUnit = item.units.find((unit) => unit.id === selectedUnits[item.id]);
                  return (
                    <article className="inventory-row" key={item.id} style={{ animationDelay: `${index * 70}ms` }}>
                      <div className={`item-symbol symbol-${item.kind}`}>
                        {item.kind === 'ball' ? <CircleDot size={29} strokeWidth={1.6} /> : <Triangle size={27} strokeWidth={1.6} />}
                      </div>
                      <div className="inventory-info">
                        <div className="item-category">{item.category}</div><h3>{item.name}</h3><p>{item.description}</p>
                      </div>
                      <div className="inventory-state">
                        <span className={`availability ${item.available > 0 ? 'is-available' : 'is-unavailable'}`}><span />{item.available > 0 ? `${item.available} available` : 'Unavailable'}</span>
                        <span className="tracking-note">{item.trackingMode === 'bulk' ? `${item.total} sets` : `${item.total} tagged units`}</span>
                        {item.requiresApproval && <span className="approval-note">Staff approval</span>}
                      </div>
                      <div className="inventory-action">
                        {activeRequest ? (
                          <span className={`request-state ${statusTone(activeRequest.status)}`}>{statusLabel(activeRequest.status)}</span>
                        ) : (
                          <>
                            {item.trackingMode === 'serialized' && item.units.length > 0 && (
                              <OverflowMenu
                                label={`Choose a specific unit of ${item.name}`}
                                open={unitPickerId === item.id}
                                onToggle={() => setUnitPickerId(unitPickerId === item.id ? null : item.id)}
                              >
                                <p className="menu-title">Choose a unit</p>
                                {item.units.map((unit) => (
                                  <button className="menu-action" key={unit.id} onClick={() => { setSelectedUnits((current) => ({ ...current, [item.id]: unit.id })); setUnitPickerId(null); }} type="button">
                                    {unit.assetTag}{selectedUnits[item.id] === unit.id ? ' · Selected' : ''}
                                  </button>
                                ))}
                              </OverflowMenu>
                            )}
                            <button className="reserve-button" disabled={item.available <= 0 || isPending || !mutationsEnabled} onClick={() => reserveItem(item)} type="button">
                              Request gear <ArrowUpRight size={15} />
                            </button>
                          </>
                        )}
                        {selectedUnit && !activeRequest && <span className="selected-unit">{selectedUnit.assetTag}</span>}
                      </div>
                    </article>
                  );
                })}
                {filteredItems.length === 0 && <div className="empty-state"><Search size={24} /><h3>No gear found</h3><p>Try changing your search or filters.</p></div>}
              </div>
            </section>

            <section className="student-gear-section" aria-labelledby="student-gear-heading">
              <div className="section-heading">
                <div><p className="eyebrow">YOUR ACTIVITY</p><h2 id="student-gear-heading">Your gear</h2></div>
                <span className="count-badge">{studentCheckedOut} checked out</span>
              </div>
              {studentRequests.length === 0 ? (
                <div className="empty-inline">Requests and checkouts will appear here.</div>
              ) : (
                <div className="student-request-list">
                  {studentRequests.map((request) => (
                    <article className="student-request-row" key={request.id}>
                      <span className="row-symbol"><Package size={19} /></span>
                      <div className="student-request-info"><strong>{request.itemName}</strong><span>{request.unitTag ?? 'Bulk item'}</span></div>
                      <span className={`status-label ${statusTone(request.status)}`}>{statusLabel(request.status)}</span>
                      {request.status === 'pending_approval' || request.status === 'approved' ? (
                        <OverflowMenu label={`More options for ${request.itemName}`} open={openMenuId === request.id} onToggle={() => setOpenMenuId(openMenuId === request.id ? null : request.id)}>
                          <button className="menu-action menu-danger" disabled={isPending} onClick={() => cancelRequest(request.id)} type="button">Cancel request</button>
                        </OverflowMenu>
                      ) : request.status === 'checked_out' ? (
                        <button className="return-request-button" disabled={isPending || !mutationsEnabled} onClick={() => requestReturn(request.id)} type="button">Request return</button>
                      ) : <span className="return-review-note">Staff review pending</span>}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <footer className="gearup-footer"><span>GEARUP <i>·</i> TREVECCA NAZARENE UNIVERSITY</span><span>Borrow, return, repeat <Activity size={14} /></span></footer>
      </main>
    </div>
  );
}
