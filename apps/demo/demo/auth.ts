import { getRole } from './store';
export const getSession=async()=>({role:getRole()??'viewer'});
