export interface Services {
  _id: string;
  _type: 'services';
  name: string;
  id: {
    current: string;
  };
  duration: string;
  price: number;
  opis?: Array<{
    _type: 'block';
    children: Array<{
      _type: 'span';
      text: string;
    }>;
  }>;
}

export interface PageData {
  services: Services[];
}