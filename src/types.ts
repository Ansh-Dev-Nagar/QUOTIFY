export interface Quote {
  text: string;
  author: string;
  isFavorite: boolean;
}

export interface QuotableResponse {
  _id: string;
  content: string;
  author: string;
  tags: string[];
  authorSlug: string;
  length: number;
  dateAdded: string;
  dateModified: string;
} 