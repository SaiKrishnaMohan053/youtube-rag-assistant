export const isAdminUser = (user) => user?.role === 'admin';
export const isRegularUser = (user) => user?.role === 'user';