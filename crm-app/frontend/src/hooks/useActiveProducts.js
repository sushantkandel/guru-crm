import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

export function useActiveProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const reload = useCallback(() => {
    setLoading(true);
    return api
      .get('/products', { params: { active_only: 'true' } })
      .then((res) => setProducts(res.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload, location.pathname]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        reload();
      }
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [reload]);

  return { products, loading, reload };
}
