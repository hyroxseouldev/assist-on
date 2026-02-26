export type CommunityPostStatus = "published" | "hidden" | "deleted";

export type CommunityPostRow = {
  id: string;
  author_id: string;
  title: string;
  content_html: string;
  status: CommunityPostStatus;
  created_at: string;
  updated_at: string;
};

export type CommunityCommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  content_html: string;
  status: CommunityPostStatus;
  created_at: string;
  updated_at: string;
};

export type CommunityProfileMap = Record<
  string,
  {
    fullName: string;
    avatarUrl: string | null;
  }
>;

export type CommunityFeedItem = {
  id: string;
  title: string;
  contentHtml: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

export type CommunityCommentItem = {
  id: string;
  postId: string;
  contentHtml: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  canEdit: boolean;
};

export type CommunityPostDetail = {
  id: string;
  title: string;
  contentHtml: string;
  createdAt: string;
  updatedAt: string;
  status: CommunityPostStatus;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  canEdit: boolean;
  comments: CommunityCommentItem[];
};
