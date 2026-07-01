export interface AuthoringDocument {
  objects: AuthoringObject[];
}

export interface AuthoringObject {
  type: string;
  id: string;
  [key: string]: unknown;
}
