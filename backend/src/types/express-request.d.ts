declare namespace Express {
  interface Request {
    gdsChannel?: 'web' | 'app';
  }
}
