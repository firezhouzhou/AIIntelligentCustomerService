import { Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from '../services/chapter14Service';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * 受保护的路由组件
 * 如果未登录，重定向到登录页并保存当前路径
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  
  if (!isLoggedIn()) {
    // 保存当前路径，登录后跳转回来
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
