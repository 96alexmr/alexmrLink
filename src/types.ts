export interface Env {
  LINKS: KVNamespace;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
}

export interface LinkMetadata {
  value: string;
  createdAt: number;
}

export interface TokenMetadata {
  name: string;
  createdAt: number;
}
