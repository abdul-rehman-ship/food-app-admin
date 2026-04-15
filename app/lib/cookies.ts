import { getCookie, setCookie, deleteCookie } from 'cookies-next';

export const setAdminAuth = (value: string) => {
  setCookie('admin_auth', value, { maxAge: 60 * 60 * 24 }); // 24 hours
};

export const getAdminAuth = () => {
  return getCookie('admin_auth');
};

export const removeAdminAuth = () => {
  deleteCookie('admin_auth');
};