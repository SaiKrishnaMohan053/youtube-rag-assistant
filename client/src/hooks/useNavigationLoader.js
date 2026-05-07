import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const useNavigationLoader = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 300); // small delay to show loader

    return () => clearTimeout(timeout);
  }, [location.pathname]);

  return loading;
};

export default useNavigationLoader;
