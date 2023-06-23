export interface UploadRequest {
  params?: any;
  fileName?: string;
  uploadData: any;
}

export interface JsonToCsvOption {
  parse?: object | null;
  encode?: object | null;
  name?: string;
  download?: boolean;
}