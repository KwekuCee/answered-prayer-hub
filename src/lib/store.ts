import { Church, Inviter, Member, Admin } from "./types";

const AUTH_CODE = "100PRAYER";

// Seed data
const seedChurches: Church[] = [
  { id: "c1", name: "Grace Community Church", target: 200, confirmed: 87 },
  { id: "c2", name: "Living Faith Chapel", target: 150, confirmed: 45 },
  { id: "c3", name: "New Hope Assembly", target: 100, confirmed: 32 },
];

const seedInviters: Inviter[] = [
  { id: "i1", fullName: "Pastor James Okonkwo", email: "james@grace.org", phone: "+234801234567", churchName: "Grace Community Church", churchId: "c1", createdAt: "2025-12-01", inviteCount: 35, confirmedCount: 28 },
  { id: "i2", fullName: "Sister Mary Adebayo", email: "mary@grace.org", phone: "+234802345678", churchName: "Grace Community Church", churchId: "c1", createdAt: "2025-12-05", inviteCount: 22, confirmedCount: 18 },
  { id: "i3", fullName: "Deacon Peter Eze", email: "peter@living.org", phone: "+234803456789", churchName: "Living Faith Chapel", churchId: "c2", createdAt: "2025-12-10", inviteCount: 15, confirmedCount: 10 },
  { id: "i4", fullName: "Elder Sarah Nwosu", email: "sarah@newhope.org", phone: "+234804567890", churchName: "New Hope Assembly", churchId: "c3", createdAt: "2025-12-15", inviteCount: 20, confirmedCount: 14 },
];

const seedMembers: Member[] = [
  { id: "m1", fullName: "John Doe", phone: "+234811111111", occupation: "Teacher", location: "Lagos", inviterId: "i1", inviterName: "Pastor James Okonkwo", churchId: "c1", churchName: "Grace Community Church", confirmed: true, createdAt: "2026-01-10" },
  { id: "m2", fullName: "Jane Smith", email: "jane@email.com", phone: "+234822222222", occupation: "Nurse", location: "Abuja", inviterId: "i1", inviterName: "Pastor James Okonkwo", churchId: "c1", churchName: "Grace Community Church", confirmed: true, createdAt: "2026-01-12" },
  { id: "m3", fullName: "Michael Obi", phone: "+234833333333", location: "Lagos", inviterId: "i2", inviterName: "Sister Mary Adebayo", churchId: "c1", churchName: "Grace Community Church", confirmed: false, createdAt: "2026-02-28" },
  { id: "m4", fullName: "Grace Emeka", phone: "+234844444444", occupation: "Engineer", inviterId: "i3", inviterName: "Deacon Peter Eze", churchId: "c2", churchName: "Living Faith Chapel", confirmed: true, createdAt: "2026-02-01" },
  { id: "m5", fullName: "David Chukwu", phone: "+234855555555", inviterId: "i4", inviterName: "Elder Sarah Nwosu", churchId: "c3", churchName: "New Hope Assembly", confirmed: false, createdAt: "2026-02-28" },
];

const seedAdmins: Admin[] = [
  { id: "a1", fullName: "Super Admin", username: "superadmin", email: "super@100prayer.org", phone: "+234800000000", churchName: "All Churches", churchId: "all", isSuperAdmin: true, createdAt: "2025-11-01" },
  { id: "a2", fullName: "Admin Grace", username: "admingrace", email: "admin@grace.org", phone: "+234801000000", churchName: "Grace Community Church", churchId: "c1", isSuperAdmin: false, createdAt: "2025-11-15" },
];

// Simple localStorage-based store
function getStore<T>(key: string, seed: T[]): T[] {
  const stored = localStorage.getItem(key);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

function setStore<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export const store = {
  getChurches: () => getStore<Church>("churches", seedChurches),
  setChurches: (d: Church[]) => setStore("churches", d),

  getInviters: () => getStore<Inviter>("inviters", seedInviters),
  setInviters: (d: Inviter[]) => setStore("inviters", d),

  getMembers: () => getStore<Member>("members", seedMembers),
  setMembers: (d: Member[]) => setStore("members", d),

  getAdmins: () => getStore<Admin>("admins", seedAdmins),
  setAdmins: (d: Admin[]) => setStore("admins", d),

  validateAuthCode: (code: string) => code === AUTH_CODE,

  // Simple password store (in real app, use proper auth)
  getPasswords: (): Record<string, string> => {
    const stored = localStorage.getItem("passwords");
    if (stored) return JSON.parse(stored);
    const defaults: Record<string, string> = { superadmin: "admin123", admingrace: "admin123" };
    localStorage.setItem("passwords", JSON.stringify(defaults));
    return defaults;
  },
  setPassword: (username: string, password: string) => {
    const passwords = store.getPasswords();
    passwords[username] = password;
    localStorage.setItem("passwords", JSON.stringify(passwords));
  },

  getCurrentAdmin: (): Admin | null => {
    const stored = localStorage.getItem("currentAdmin");
    return stored ? JSON.parse(stored) : null;
  },
  setCurrentAdmin: (admin: Admin | null) => {
    if (admin) localStorage.setItem("currentAdmin", JSON.stringify(admin));
    else localStorage.removeItem("currentAdmin");
  },
};
