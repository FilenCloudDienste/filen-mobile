interface URL {
  hash: string;
  host: string;
  hostname: string;
  href: string;
  toString(): string;
  readonly origin: string;
  password: string;
  pathname: string;
  port: string;
  protocol: string;
  search: string;
  readonly searchParams: URLSearchParams;
  username: string;
  toJSON(): string;
}

declare var URL: {
  prototype: URL;
  new(url: string, base?: string | URL): URL;
  createObjectURL(object: any): string;
  revokeObjectURL(url: string): void;
};
