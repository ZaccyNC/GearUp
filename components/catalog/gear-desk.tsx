'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CircleDot,
  Minus,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Triangle,
  UserRound,
  Wrench,
} from 'lucide-react';

export type CatalogItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  location: string;
  available: number;
  total: number;
  trackingMode: 'serialized' | 'bulk';
  requiresApproval: boolean;
  kind: 'ball' | 'cones';
};

type Mode = 'student' | 'staff' | 'admin';
type DemoRequest = {
  id: number;
  itemId: string;
  itemName: string;
  requestedBy: string;
  status: 'pending' | 'checked_out' | 'returned';
};

const modeDetails: Record<Mode, { label: string; user: string }> = {
  student: { label: 'Student', user: 'Alex Student' },
  staff: { label: 'Desk staff', user: 'Sam Staff' },
  admin: { label: 'Administrator', user: 'Taylor Admin' },
};

export default function GearDesk({
  initialItems,
  source,
}: {
  initialItems: CatalogItem[];
  source: 'database' | 'sample';
}) {
  const [mode, setMode] = useState<Mode>('student');
  const [items, setItems] = useState(initialItems);
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All gear');
  const [notice, setNotice] = useState('');

  const categories = ['All gear', ...new Set(items.map((item) => item.category))];
  const filteredItems = items.filter((item) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query ||
      `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query);
    return matchesQuery && (category === 'All gear' || item.category === category);
  });
  const pendingCount = requests.filter((request) => request.status === 'pending').length;
  const availableCount = items.reduce((sum, item) => {
    const inUse = requests.filter(
      (request) => request.itemId === item.id && request.status !== 'returned',
    ).length;
    return sum + Math.max(0, item.available - inUse);
  }, 0);

  function reserveItem(item: CatalogItem) {
    const inUse = requests.filter(
      (request) => request.itemId === item.id && request.status !== 'returned',
    ).length;
    if (inUse >= item.available) return;

    setRequests((current) => [
      ...current,
      {
        id: Date.now(),
        itemId: item.id,
        itemName: item.name,
        requestedBy: modeDetails.student.user,
        status: 'pending',
      },
    ]);
    setNotice(`Request sent for ${item.name}`);
  }

  function updateRequest(requestId: number) {
    setRequests((current) => current.map((request) => {
      if (request.id !== requestId) return request;
      const status = request.status === 'pending'
        ? 'checked_out'
        : request.status === 'checked_out'
          ? 'returned'
          : 'returned';
      return { ...request, status };
    }));
    setNotice('Checkout record updated');
  }

  function adjustQuantity(itemId: string, amount: number) {
    setItems((current) => current.map((item) => {
      if (item.id !== itemId) return item;
      const total = Math.max(0, item.total + amount);
      const available = Math.min(total, Math.max(0, item.available + amount));
      return { ...item, available, total };
    }));
    setNotice('Demo inventory count updated');
  }

  return (
    <div className="desk-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Trevecca Gear Desk home">
          <span className="brand-mark"><Package size={19} strokeWidth={2.2} /></span>
          <span className="brand-name">gear<span>desk</span></span>
          <span className="brand-campus">TREVECCA</span>
        </Link>
        <div className="topbar-right">
          <span className={`source-pill ${source === 'sample' ? 'source-sample' : ''}`}>
            <span className="source-dot" />
            {source === 'database' ? 'Database inventory' : 'Sample inventory'}
          </span>
          <div className="user-chip"><UserRound size={16} /><span>{modeDetails[mode].user}</span></div>
        </div>
      </header>

      <main className="desk-main">
        <div className="welcome-line">
          <div>
            <p className="eyebrow">MOORE FITNESS CENTER <span>·</span> EQUIPMENT LIBRARY</p>
            <h1>Good gear. <em>Good games.</em></h1>
            <p className="welcome-copy">Find what you need for your next run, match, or practice.</p>
          </div>
          <div className="availability-stamp">
            <Activity size={17} />
            <span><strong>{availableCount}</strong> available now</span>
          </div>
        </div>

        <div className="mode-bar">
          <div className="mode-label"><ShieldCheck size={16} /> DEMO ROLE</div>
          <div className="mode-switch" role="group" aria-label="Choose demo role">
            {(['student', 'staff', 'admin'] as const).map((option) => (
              <button
                className={`mode-button ${mode === option ? 'mode-active' : ''}`}
                key={option}
                onClick={() => { setMode(option); setNotice(''); }}
                type="button"
              >
                {modeDetails[option].label}
              </button>
            ))}
          </div>
          <p className="demo-warning">Demo only · changes are not saved</p>
        </div>

        {notice && (
          <div className="notice" role="status">
            <CheckCircle2 size={16} />{notice}
            <button type="button" onClick={() => setNotice('')} aria-label="Dismiss notification">×</button>
          </div>
        )}

        {mode === 'staff' ? (
          <section className="workflow-section" aria-labelledby="desk-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">STAFF WORKSPACE</p>
                <h2 id="desk-heading">Checkout desk</h2>
              </div>
              <span className="count-badge">{pendingCount} awaiting pickup</span>
            </div>
            <div className="desk-list">
              {requests.length === 0 ? (
                <div className="empty-state">
                  <ClipboardList size={25} />
                  <h3>Nothing in the queue yet</h3>
                  <p>Switch to Student and request an item to see it appear here.</p>
                </div>
              ) : requests.map((request) => (
                <article className="desk-row" key={request.id}>
                  <span className="row-symbol"><Package size={20} /></span>
                  <div className="desk-row-info">
                    <strong>{request.itemName}</strong>
                    <span>{request.requestedBy} <i>·</i> {request.status.replace('_', ' ')}</span>
                  </div>
                  <span className={`status-label status-${request.status}`}>
                    {request.status === 'pending' ? <Clock3 size={14} /> : <Check size={14} />}
                    {request.status === 'pending' ? 'Ready for pickup' : request.status === 'checked_out' ? 'Checked out' : 'Returned'}
                  </span>
                  {request.status !== 'returned' && (
                    <button className="action-button" type="button" onClick={() => updateRequest(request.id)}>
                      {request.status === 'pending' ? <><ArrowDownToLine size={15} /> Check out</> : <><Check size={15} /> Check in</>}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        ) : mode === 'admin' ? (
          <section className="workflow-section" aria-labelledby="admin-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">INVENTORY CONTROL</p>
                <h2 id="admin-heading">Manage equipment</h2>
              </div>
              <span className="count-badge">{items.length} catalog items</span>
            </div>
            <div className="admin-list">
              {items.map((item) => (
                <article className="admin-row" key={item.id}>
                  <span className={`item-symbol symbol-${item.kind}`}>
                    {item.kind === 'ball' ? <CircleDot size={24} /> : <Triangle size={23} />}
                  </span>
                  <div className="admin-row-info">
                    <strong>{item.name}</strong>
                    <span>{item.category} <i>·</i> {item.location}</span>
                  </div>
                  <span className="quantity-value">{item.available}<small> / {item.total}</small></span>
                  <div className="quantity-controls" aria-label={`Adjust ${item.name} demo quantity`}>
                    <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => adjustQuantity(item.id, -1)}><Minus size={15} /></button>
                    <button type="button" aria-label={`Add one ${item.name}`} onClick={() => adjustQuantity(item.id, 1)}><Plus size={15} /></button>
                  </div>
                </article>
              ))}
              {items.length === 0 && <p className="empty-inline">No equipment in the catalog.</p>}
            </div>
          </section>
        ) : (
          <section className="catalog-section" aria-labelledby="catalog-heading">
            <div className="section-heading catalog-heading">
              <div>
                <p className="eyebrow">READY WHEN YOU ARE</p>
                <h2 id="catalog-heading">Browse equipment</h2>
              </div>
              <label className="search-box">
                <Search size={17} />
                <input
                  aria-label="Search equipment"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search gear"
                />
              </label>
            </div>

            <div className="catalog-tools">
              <div className="category-tabs" role="group" aria-label="Filter by category">
                {categories.map((option) => (
                  <button
                    className={`category-tab ${category === option ? 'category-active' : ''}`}
                    key={option}
                    onClick={() => setCategory(option)}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
              <span className="results-count">{filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}</span>
            </div>

            <div className="inventory-list">
              {filteredItems.map((item, index) => {
                const inUse = requests.filter(
                  (request) => request.itemId === item.id && request.status !== 'returned',
                ).length;
                const available = Math.max(0, item.available - inUse);
                const activeRequest = requests.find(
                  (request) => request.itemId === item.id && request.status !== 'returned',
                );
                return (
                  <article className="inventory-row" key={item.id} style={{ animationDelay: `${index * 70}ms` }}>
                    <div className={`item-symbol symbol-${item.kind}`}>
                      {item.kind === 'ball' ? <CircleDot size={29} strokeWidth={1.6} /> : <Triangle size={27} strokeWidth={1.6} />}
                    </div>
                    <div className="inventory-info">
                      <div className="item-category">{item.category}</div>
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      <span className="item-location"><Wrench size={13} /> {item.location}</span>
                    </div>
                    <div className="inventory-state">
                      <span className={`availability ${available > 0 ? 'is-available' : 'is-unavailable'}`}>
                        <span />{available > 0 ? `${available} available` : 'All checked out'}
                      </span>
                      <span className="tracking-note">{item.trackingMode === 'bulk' ? `${item.total} sets` : `${item.total} tagged units`}</span>
                      {item.requiresApproval && <span className="approval-note">Staff approval</span>}
                    </div>
                    <div className="inventory-action">
                      {activeRequest ? (
                        <span className="request-state"><Clock3 size={15} /> {activeRequest.status === 'pending' ? 'Requested' : 'Checked out'}</span>
                      ) : (
                        <button
                          className="reserve-button"
                          disabled={available <= 0}
                          onClick={() => reserveItem(item)}
                          type="button"
                        >
                          Request gear <ArrowUpRight size={15} />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
              {filteredItems.length === 0 && (
                <div className="empty-state">
                  <Search size={24} />
                  <h3>No gear found</h3>
                  <p>Try another search or select a different category.</p>
                </div>
              )}
            </div>
            <div className="catalog-footnote"><span><Clock3 size={14} /> Pickup at Moore Fitness Center</span><span><ArrowUpRight size={14} /> Return gear in the same condition</span></div>
          </section>
        )}

        <footer className="desk-footer">
          <span>GEAR DESK <i>·</i> TREVECCA NAZARENE UNIVERSITY</span>
          <span>Campus recreation <Activity size={14} /></span>
        </footer>
      </main>
    </div>
  );
}
