export interface Church {
  id: string;
  name: string;
  target: number;
  confirmed: number;
}

export interface Inviter {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  churchName: string;
  churchId: string;
  createdAt: string;
  inviteCount: number;
  confirmedCount: number;
}

export interface Member {
  id: string;
  fullName: string;
  email?: string;
  phone: string;
  occupation?: string;
  location?: string;
  dateOfBirth?: string;
  inviterId: string;
  inviterName: string;
  churchId: string;
  churchName: string;
  confirmed: boolean;
  createdAt: string;
}

export interface Admin {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  churchName: string;
  churchId: string;
  isSuperAdmin: boolean;
  createdAt: string;
}
