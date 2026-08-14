export const transformUser = (data: Record<string, any>): Record<string, any> => {
  const transformed: Record<string, any> = { ...data };
  
  // Ensure required fields exist
  if (!transformed.createdAt) transformed.createdAt = new Date().toISOString();
  if (!transformed.updatedAt) transformed.updatedAt = new Date().toISOString();
  
  // Normalize email
  if (transformed.email) {
    transformed.email = transformed.email.toLowerCase().trim();
  }
  
  // Normalize phone
  if (transformed.phone) {
    transformed.phone = transformed.phone.replace(/[^0-9+]/g, '');
  }
  
  // Ensure role is set
  if (!transformed.role) {
    transformed.role = 'customer';
  }
  
  return transformed;
};

export const transformCompanion = (data: Record<string, any>): Record<string, any> => {
  const transformed: Record<string, any> = { ...data };
  
  if (!transformed.createdAt) transformed.createdAt = new Date().toISOString();
  if (!transformed.updatedAt) transformed.updatedAt = new Date().toISOString();
  
  // Ensure hourlyRate is a number
  if (transformed.hourlyRate) {
    transformed.hourlyRate = Number(transformed.hourlyRate);
  }
  
  // Ensure rating is a number
  if (transformed.rating) {
    transformed.rating = Number(transformed.rating);
  }
  
  // Normalize availability array
  if (transformed.availableDays && !Array.isArray(transformed.availableDays)) {
    transformed.availableDays = [];
  }
  
  return transformed;
};

export const transformBooking = (data: Record<string, any>): Record<string, any> => {
  const transformed: Record<string, any> = { ...data };
  
  if (!transformed.createdAt) transformed.createdAt = new Date().toISOString();
  if (!transformed.updatedAt) transformed.updatedAt = new Date().toISOString();
  
  // Ensure status is lowercase
  if (transformed.status) {
    transformed.status = transformed.status.toLowerCase();
  }
  
  // Ensure amount is a number
  if (transformed.amount) {
    transformed.amount = Number(transformed.amount);
  }
  
  return transformed;
};

export const transformMessage = (data: Record<string, any>): Record<string, any> => {
  const transformed: Record<string, any> = { ...data };
  
  if (!transformed.createdAt) transformed.createdAt = new Date().toISOString();
  
  // Ensure isRead is boolean
  if (transformed.isRead !== undefined) {
    transformed.isRead = Boolean(transformed.isRead);
  }
  
  return transformed;
};

export const transformCommunityPost = (data: Record<string, any>): Record<string, any> => {
  const transformed: Record<string, any> = { ...data };
  
  if (!transformed.createdAt) transformed.createdAt = new Date().toISOString();
  if (!transformed.updatedAt) transformed.updatedAt = new Date().toISOString();
  
  // Ensure counters are numbers
  if (transformed.likesCount) transformed.likesCount = Number(transformed.likesCount);
  if (transformed.commentsCount) transformed.commentsCount = Number(transformed.commentsCount);
  if (transformed.sharesCount) transformed.sharesCount = Number(transformed.sharesCount);
  
  return transformed;
};

export const transformComment = (data: Record<string, any>): Record<string, any> => {
  const transformed: Record<string, any> = { ...data };
  
  if (!transformed.createdAt) transformed.createdAt = new Date().toISOString();
  if (!transformed.updatedAt) transformed.updatedAt = new Date().toISOString();
  
  return transformed;
};

export const transformLike = (data: Record<string, any>): Record<string, any> => {
  const transformed: Record<string, any> = { ...data };
  
  if (!transformed.createdAt) transformed.createdAt = new Date().toISOString();
  
  return transformed;
};

export const transformStory = (data: Record<string, any>): Record<string, any> => {
  const transformed: Record<string, any> = { ...data };
  
  if (!transformed.createdAt) transformed.createdAt = new Date().toISOString();
  if (!transformed.updatedAt) transformed.updatedAt = new Date().toISOString();
  
  // Ensure likes is a number
  if (transformed.likes) transformed.likes = Number(transformed.likes);
  if (transformed.likesCount) transformed.likesCount = Number(transformed.likesCount);
  
  return transformed;
};

export const transformStoryLike = (data: Record<string, any>): Record<string, any> => {
  const transformed: Record<string, any> = { ...data };
  
  if (!transformed.createdAt) transformed.createdAt = new Date().toISOString();
  
  return transformed;
};

export const transformNotification = (data: Record<string, any>): Record<string, any> => {
  const transformed: Record<string, any> = { ...data };
  
  if (!transformed.createdAt) transformed.createdAt = new Date().toISOString();
  if (!transformed.updatedAt) transformed.updatedAt = new Date().toISOString();
  
  // Ensure read is boolean
  if (transformed.read !== undefined) {
    transformed.read = Boolean(transformed.read);
  }
  
  return transformed;
};

export const transformReview = (data: Record<string, any>): Record<string, any> => {
  const transformed: Record<string, any> = { ...data };
  
  if (!transformed.createdAt) transformed.createdAt = new Date().toISOString();
  if (!transformed.updatedAt) transformed.updatedAt = new Date().toISOString();
  
  // Ensure rating is a number between 1 and 5
  if (transformed.rating) {
    transformed.rating = Math.min(5, Math.max(1, Number(transformed.rating)));
  }
  
  return transformed;
};

export const transformEvent = (data: Record<string, any>): Record<string, any> => {
  const transformed: Record<string, any> = { ...data };
  
  if (!transformed.createdAt) transformed.createdAt = new Date().toISOString();
  if (!transformed.updatedAt) transformed.updatedAt = new Date().toISOString();
  
  // Ensure date fields are ISO strings
  if (transformed.date) {
    transformed.date = new Date(transformed.date).toISOString();
  }
  if (transformed.endDate) {
    transformed.endDate = new Date(transformed.endDate).toISOString();
  }
  
  return transformed;
};

export const transformActivity = (data: Record<string, any>): Record<string, any> => {
  const transformed: Record<string, any> = { ...data };
  
  if (!transformed.createdAt) transformed.createdAt = new Date().toISOString();
  if (!transformed.updatedAt) transformed.updatedAt = new Date().toISOString();
  
  // Ensure price is a number
  if (transformed.price) {
    transformed.price = Number(transformed.price);
  }
  
  return transformed;
};

export const transformPartner = (data: Record<string, any>): Record<string, any> => {
  const transformed: Record<string, any> = { ...data };
  
  if (!transformed.createdAt) transformed.createdAt = new Date().toISOString();
  if (!transformed.updatedAt) transformed.updatedAt = new Date().toISOString();
  
  return transformed;
};

export const transformConversation = (data: Record<string, any>): Record<string, any> => {
  const transformed: Record<string, any> = { ...data };
  
  if (!transformed.createdAt) transformed.createdAt = new Date().toISOString();
  if (!transformed.updatedAt) transformed.updatedAt = new Date().toISOString();
  
  // Ensure lastMessageAt is ISO string
  if (transformed.lastMessageAt) {
    transformed.lastMessageAt = new Date(transformed.lastMessageAt).toISOString();
  }
  
  return transformed;
};

export const transformDocument = (
  collection: string,
  data: Record<string, any>
): Record<string, any> => {
  const transformers: Record<string, (d: Record<string, any>) => Record<string, any>> = {
    users: transformUser,
    companions: transformCompanion,
    bookings: transformBooking,
    messages: transformMessage,
    community_posts: transformCommunityPost,
    comments: transformComment,
    likes: transformLike,
    stories: transformStory,
    story_likes: transformStoryLike,
    notifications: transformNotification,
    reviews: transformReview,
    events: transformEvent,
    activities: transformActivity,
    partners: transformPartner,
    conversations: transformConversation,
  };

  const transformer = transformers[collection];
  if (transformer) {
    return transformer(data);
  }

  // Default transformation
  if (!data.createdAt) data.createdAt = new Date().toISOString();
  if (!data.updatedAt) data.updatedAt = new Date().toISOString();
  return data;
};
