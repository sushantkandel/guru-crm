import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import {
  pageShell,
  pageCardPadded,
  pageCardHeader,
  pageSectionTitle,
  dataTableWrap,
  dataTable,
  statGrid,
  statCard,
  statCardLabel,
  statCardValue,
  statCardSub,
  loadingState,
} from '../utils/formStyles';

function StatCard({ label, value, sub, color, to }) {
  const content = (
    <div className={`${statCard} ${to ? 'hover:border-blue-300' : ''}`}>
      <p className={statCardLabel}>{label}</p>
      <p className={`${statCardValue} ${color}`}>{value}</p>
      {sub && <p className={statCardSub}>{sub}</p>}
    </div>
  );
  return to ? <Link to={to} className="block">{content}</Link> : content;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [outstanding, setOutstanding] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/payments/outstanding'),
    ]).then(([statsRes, outRes]) => {
      setStats(statsRes.data);
      setOutstanding(outRes.data.slice(0, 5));
    });
  }, []);

  if (!stats) {
    return <div className={pageShell}><div className={loadingState}>Loading dashboard…</div></div>;
  }

  return (
    <div className={pageShell}>
      <PageHeader title="Dashboard" subtitle="Overview of customers, orders, and payments" />

      <div className={statGrid}>
        <StatCard label="Total Customers" value={stats.totalCustomers} color="text-slate-900" to="/customers" />
        <StatCard label="Pending Orders" value={stats.pendingOrders} color="text-amber-600" to="/orders?status=pending" />
        <StatCard
          label="Outstanding Credit"
          value={`Rs ${stats.totalOutstanding.toLocaleString()}`}
          color="text-red-600"
          to="/payments"
        />
        <StatCard
          label="Inactive (30 days)"
          value={stats.inactiveCustomers}
          sub="No orders in last 30 days"
          color="text-purple-600"
          to="/customers"
        />
      </div>

      <div className={pageCardPadded}>
        <div className={pageCardHeader}>
          <h3 className={pageSectionTitle}>Top Outstanding Payments</h3>
          <Link to="/payments" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>
        {outstanding.length === 0 ? (
          <p className="text-sm text-slate-500">No outstanding payments</p>
        ) : (
          <div className={dataTableWrap}>
            <table className={dataTable}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Shop</th>
                  <th className="text-right">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {outstanding.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/customers/${c.id}`} className="text-blue-600 hover:underline font-medium">
                        {c.name}
                      </Link>
                    </td>
                    <td className="text-slate-600">{c.shopName}</td>
                    <td className="text-right font-medium text-red-600">
                      Rs {c.balance.remaining.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
