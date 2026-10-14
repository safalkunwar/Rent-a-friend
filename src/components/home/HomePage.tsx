import { useMemo } from 'react';
import { ArrowRight, CalendarDays, Compass, MapPin, Plus } from 'lucide-react';
import type { Activity, Booking, CommunityPost, Companion, Event, ExperienceStory, Partner, User } from '../../types';
import { CompanionCard } from '../companions/CompanionCard';
import { SafeImage } from '../ui/SafeImage';
import { groupStories } from '../../services/storyGroups';
import { hasHomeInterestMatch, rankHomePeople } from '../../services/homeRecommendations';

interface HomePageProps {
  user: User | null;
  companions: Companion[];
  activities: Activity[];
  events: Event[];
  partners: Partner[];
  stories: ExperienceStory[];
  posts: CommunityPost[];
  bookings: Booking[];
  favorites: string[];
  peopleLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onToggleFavorite: (id: string) => void | Promise<void>;
  onShowToast?: (message: string, type?: string) => void;
  onViewCompanion: (companion: Companion) => void;
  onViewStory: (story: ExperienceStory) => void;
  onCreateStory: () => void;
  onExplore: (section: 'companions' | 'activities' | 'events' | 'community' | 'places') => void;
  onOpenEvent: (id: string) => void;
  onOpenPost: (id: string) => void;
  onOpenBookings: () => void;
}

function nepalDay(): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function futureIsoDay(date: unknown, today: string): boolean {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) && date >= today;
}

/** A finite summary of existing destinations. Full browsing and social actions remain on their pages. */
export function HomePage(props: HomePageProps) {
  const { user, companions, activities, events, partners, stories, posts, bookings } = props;
  const people = useMemo(() => rankHomePeople(companions, user), [companions, user?.interests, user?.location]);
  const interestMatch = hasHomeInterestMatch(people);
  const today = nepalDay();
  const event = events.filter(item => futureIsoDay(item.date, today)).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))[0];
  const activity = activities[0];
  const storyGroups = groupStories(stories).slice(0, 5);
  const visiblePosts = posts.slice(0, 2);
  const place = partners.slice(0, 2);
  const nextBooking = bookings.filter(item => item.userId === user?.id && ['pending', 'confirmed', 'active'].includes(item.status) && futureIsoDay(item.date, today))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0];

  return <div className="home-summary space-y-8 pb-16">
    {props.error && <div role="alert" className="home-source-error text-sm text-text-secondary bg-surface border border-border-token rounded-xl p-4">{props.error} <button className="text-primary-action underline ml-2" onClick={props.onRetry}>Retry</button></div>}

    {nextBooking && <section className="home-next-plan bg-surface border border-border-token rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3" aria-label="Your next booking">
      <div><h2 className="text-base font-semibold text-text-primary">Your next plan</h2><p className="text-sm text-text-secondary mt-1">{nextBooking.date} · {nextBooking.time} · {nextBooking.status === 'pending' ? 'Request pending' : nextBooking.status === 'active' ? 'Active' : 'Confirmed'}</p></div>
      <button className="discovery-secondary" onClick={props.onOpenBookings}>View booking <ArrowRight size={16} aria-hidden="true" /></button>
    </section>}

    <section aria-labelledby="home-people-title">
      <div className="home-section-heading flex flex-wrap items-end justify-between gap-3 mb-4">
        <div><h2 id="home-people-title" className="text-xl font-semibold text-text-primary">{interestMatch ? 'People for you' : 'Discover people'}</h2>
          <p className="text-sm text-text-secondary mt-1">{interestMatch ? 'Shared interests from your profile.' : 'People from the current listings. Choose interests for better suggestions.'}</p></div>
        <button className="home-section-link text-sm text-primary-action min-h-11" onClick={() => props.onExplore('companions')}>See all people <ArrowRight size={16} aria-hidden="true" /></button>
      </div>
      {people.length ? <div className="home-people-grid">
        {people.map(({ companion, reason }) => <CompanionCard key={companion.id} companion={companion} layout="home" relevanceReason={reason} isFav={props.favorites.includes(companion.id)} onToggleFavorite={props.onToggleFavorite} onShowToast={props.onShowToast} onViewCompanion={props.onViewCompanion} />)}
      </div> : <p className="home-empty text-sm text-text-secondary bg-surface border border-border-token rounded-xl p-5">{props.peopleLoading ? 'Loading people…' : 'No people in the loaded results yet. Browse People or try again.'}</p>}
    </section>

    <section aria-labelledby="home-plans-title">
      <div className="home-section-heading flex items-end justify-between gap-3 mb-4"><h2 id="home-plans-title" className="text-xl font-semibold text-text-primary">Things to do</h2><button className="home-section-link text-sm text-primary-action min-h-11" onClick={() => props.onExplore('activities')}>Explore <ArrowRight size={16} aria-hidden="true" /></button></div>
      {(event || activity) ? <div className="home-preview-grid">
        {event && <button className="home-preview-card text-left bg-surface border border-border-token rounded-xl p-3 flex items-center gap-3" onClick={() => props.onOpenEvent(event.id)}>
          <SafeImage src={event.imageUrl} alt="" className="home-preview-image object-cover rounded-lg bg-surface-elevated shrink-0" fallbackType="thumbnail" />
          <span className="min-w-0"><span className="text-xs text-text-secondary flex items-center gap-1"><CalendarDays size={14} aria-hidden="true" /> Event · {event.date}</span><strong className="block text-sm text-text-primary mt-1 line-clamp-2">{event.title}</strong>{event.location && <span className="text-xs text-text-secondary flex items-center gap-1 mt-1"><MapPin size={14} aria-hidden="true" />{event.location}</span>}</span>
        </button>}
        {activity && <button className="home-preview-card text-left bg-surface border border-border-token rounded-xl p-3 flex items-center gap-3" onClick={() => props.onExplore('activities')}>
          <SafeImage src={activity.imageUrl || activity.image} alt="" className="home-preview-image object-cover rounded-lg bg-surface-elevated shrink-0" fallbackType="thumbnail" />
          <span className="min-w-0"><span className="text-xs text-text-secondary flex items-center gap-1"><Compass size={14} aria-hidden="true" /> Activity</span><strong className="block text-sm text-text-primary mt-1 line-clamp-2">{activity.title}</strong>{activity.location && <span className="text-xs text-text-secondary flex items-center gap-1 mt-1"><MapPin size={14} aria-hidden="true" />{activity.location}</span>}</span>
        </button>}
      </div> : <p className="home-empty text-sm text-text-secondary">No current plans in the loaded results. Browse Activities and Events for more.</p>}
    </section>

    {place.length > 0 && <section aria-labelledby="home-places-title">
      <div className="home-section-heading flex items-end justify-between gap-3 mb-4"><div><h2 id="home-places-title" className="text-xl font-semibold text-text-primary">Local places</h2><p className="text-sm text-text-secondary mt-1">Explore listed partners. Offers and redemption are not available here.</p></div><button className="home-section-link text-sm text-primary-action min-h-11" onClick={() => props.onExplore('places')}>See places <ArrowRight size={16} aria-hidden="true" /></button></div>
      <div className="home-preview-grid">{place.map(partner => <button key={partner.id} className="home-preview-card text-left bg-surface border border-border-token rounded-xl p-3 flex items-center gap-3" onClick={() => props.onExplore('places')}>
        <SafeImage src={partner.imageUrl} alt="" className="home-preview-image object-cover rounded-lg bg-surface-elevated shrink-0" fallbackType="thumbnail" /><span><strong className="block text-sm text-text-primary">{partner.name}</strong>{partner.loc && <span className="text-xs text-text-secondary">{partner.loc}</span>}</span>
      </button>)}</div>
    </section>}

    <section aria-labelledby="home-community-title">
      <div className="home-section-heading flex items-end justify-between gap-3 mb-3"><h2 id="home-community-title" className="text-xl font-semibold text-text-primary">Community moments</h2><button className="home-section-link text-sm text-primary-action min-h-11" onClick={() => props.onExplore('community')}>View Community <ArrowRight size={16} aria-hidden="true" /></button></div>
      <div className="home-stories flex gap-4 overflow-x-auto pb-2" aria-label="Stories">
        <button className="home-story flex flex-col items-center gap-1 text-xs text-text-secondary shrink-0 min-w-14" onClick={props.onCreateStory} aria-label="Create your Story"><span className="home-story-avatar flex items-center justify-center rounded-full border border-border-token bg-surface"><Plus size={20} aria-hidden="true" /></span>Your Story</button>
        {storyGroups.map(({ ownerId, stories: group }) => <button key={ownerId} className="home-story flex flex-col items-center gap-1 text-xs text-text-secondary shrink-0 min-w-14" onClick={() => props.onViewStory(group[0])} aria-label={`View ${group[0].userName}'s Story`}>
          <SafeImage src={group[0].userAvatar} alt="" textForInitials={group[0].userName} fallbackType="avatar" className="home-story-avatar rounded-full object-cover border border-primary-action" /><span className="max-w-16 truncate">{group[0].userName}</span>
        </button>)}
      </div>
      {visiblePosts.length > 0 && <div className="home-posts space-y-2 mt-3">{visiblePosts.map(post => <button key={post.id} className="w-full min-h-11 bg-surface border border-border-token rounded-xl p-3 text-left flex items-center gap-3" onClick={() => props.onOpenPost(post.id)}>
        {post.imageUrl && <SafeImage src={post.imageUrl} alt="" className="w-12 h-12 object-cover rounded-lg shrink-0" fallbackType="thumbnail" />}
        <span className="min-w-0"><strong className="block text-sm text-text-primary truncate">{post.title || 'Community post'}</strong>{post.userName && <span className="text-xs text-text-secondary">By {post.userName}</span>}</span>
      </button>)}</div>}
    </section>
  </div>;
}
