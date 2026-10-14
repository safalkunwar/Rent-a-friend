import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, ChevronRight, Clock, MapPin, Search, Tag, X } from 'lucide-react';
import type { Activity, Event, Partner } from '../../types';
import { searchText } from '../../services/discoverySearch';
import { MapPreview } from '../maps/MapPreview';
import { SafeImage } from '../ui/SafeImage';
import { DiscoveryPageControl } from './DiscoveryPageControl';
import './explore-page.css';

export type ExploreCategory = 'all' | 'food' | 'stays' | 'activities' | 'events' | 'benefits' | 'places';
type PageState = Omit<React.ComponentProps<typeof DiscoveryPageControl>, 'source' | 'loaded' | 'matches'>;
type MapMarker = NonNullable<React.ComponentProps<typeof MapPreview>['markers']>[number];

interface Props {
  category: ExploreCategory;
  onCategory: (category: ExploreCategory) => void;
  search: string;
  onSearch: (value: string) => void;
  city: string;
  onCity: (city: string) => void;
  activities: Activity[];
  allActivities: Activity[];
  events: Event[];
  allEvents: Event[];
  partners: Partner[];
  activityPage: PageState;
  eventPage: PageState;
  partnerPage: PageState;
  markers: MapMarker[];
  onMarkerClick: (id: string) => void;
  onAllActivities: () => void;
  onAllEvents: () => void;
  onOpenEvent: (id: string) => void;
  onCommunity: () => void;
}

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const partnerKind = (partner: Partner) => searchText(partner.category).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const foodPlace = (partner: Partner) => /\b(cafe|coffee|restaurant|food|bar|bakery)\b/.test(partnerKind(partner));
const stayPlace = (partner: Partner) => /\b(hotel|resort|homestay|hostel|lodge|stay|guesthouse)\b/.test(partnerKind(partner));
const hasBenefit = (partner: Partner) => Boolean(text(partner.disc));
const picture = (item: { imageUrl?: string; image?: string }) => text(item.imageUrl) || text(item.image);

function upcomingEvents(events: Event[]) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const today = ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
  return events.filter(event => /^\d{4}-\d{2}-\d{2}$/.test(text(event.date)) && !Number.isNaN(Date.parse(`${event.date}T00:00:00Z`)) && event.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

function SectionHeading({ title, description, action, onAction }: { title: string; description?: string; action?: string; onAction?: () => void }) {
  return <div className="explore-section-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>
    {action && <button type="button" className="explore-text-action" onClick={onAction}>{action}<ArrowRight size={16} aria-hidden="true" /></button>}
  </div>;
}

function SourceFeedback({ page, label }: { page: PageState; label: string }) {
  if (page.error) return <p className="explore-empty" role="alert">Could not load {label}. <button type="button" className="explore-text-action" onClick={() => { void page.onRetry(); }}>Try again</button></p>;
  if (page.loading) return <p className="explore-empty" role="status">Loading {label}…</p>;
  return null;
}

function ActivityCard({ activity }: { activity: Activity }) {
  const price = activity.avgPrice ?? activity.price;
  return <article className="explore-content-card">
    <SafeImage src={picture(activity)} alt={activity.title} className="explore-card-photo" fallbackType="thumbnail" />
    <div className="explore-card-body">
      <p className="explore-card-kind">{text(activity.category) || 'Activity'}</p>
      <h3>{activity.title}</h3>
      {activity.location && <p className="explore-card-meta"><MapPin size={14} aria-hidden="true" />{activity.location}</p>}
      <p className="explore-card-meta"><Clock size={14} aria-hidden="true" />{text(activity.duration) || 'Flexible'}{typeof price === 'number' && Number.isFinite(price) && price >= 0 ? ` · NPR ${price.toLocaleString()} average` : ''}</p>
      <details className="explore-card-detail"><summary>About this activity<ChevronRight size={16} aria-hidden="true" /></summary>
        <p>{text(activity.description) || 'No description has been provided yet.'}</p><p>Activity booking is not available here.</p>
      </details>
    </div>
  </article>;
}

function PartnerCard({ partner }: { partner: Partner }) {
  return <article className="explore-content-card">
    <SafeImage src={text(partner.imageUrl)} alt={partner.name} className="explore-card-photo" fallbackType="thumbnail" />
    <div className="explore-card-body">
      <p className="explore-card-kind">{text(partner.category) || 'Partner place'}</p>
      <h3>{partner.name}</h3>
      {partner.loc && <p className="explore-card-meta"><MapPin size={14} aria-hidden="true" />{partner.loc}</p>}
      {hasBenefit(partner) && <p className="explore-benefit"><Tag size={14} aria-hidden="true" /><span>{partner.disc}</span></p>}
      <details className="explore-card-detail"><summary>View place<ChevronRight size={16} aria-hidden="true" /></summary>
        <p>{partner.name}{text(partner.loc) ? ` · ${partner.loc}` : ''}</p>
        <p>{hasBenefit(partner) ? 'Partner-listed offer. Confirm availability and terms with the venue. Redemption is not available in the app.' : 'No SATHI benefit is listed for this place yet.'}</p>
      </details>
    </div>
  </article>;
}

/** Presentation over ClientApp's existing bounded sources, filters and navigation. */
export function ExplorePage(props: Props) {
  const { category, city, search, partners, activities, markers } = props;
  const q = searchText(search).trim();
  const matchingPartners = partners.filter(partner => (!q || [partner.name, partner.loc, partner.category, partner.disc].some(value => searchText(value).includes(q)))
    && (city === 'All' || searchText(partner.loc).includes(searchText(city))));
  const places = matchingPartners.filter(partner => category === 'food' ? foodPlace(partner) : category === 'stays' ? stayPlace(partner) : category === 'benefits' ? hasBenefit(partner) : true);
  const events = upcomingEvents(props.events);
  const categories = [
    { id: 'food' as const, label: 'Eat & Drink', subtitle: 'Cafés & local food', image: partners.filter(foodPlace).map(picture).find(Boolean), supported: partners.some(foodPlace) },
    { id: 'stays' as const, label: 'Stay Nearby', subtitle: 'Hotels & stays', image: partners.filter(stayPlace).map(picture).find(Boolean), supported: partners.some(stayPlace) },
    { id: 'activities' as const, label: 'Things to Do', subtitle: 'Make a day of it', image: props.allActivities.map(picture).find(Boolean), supported: props.allActivities.length > 0 },
    { id: 'events' as const, label: 'Events', subtitle: 'What’s happening', image: upcomingEvents(props.allEvents).map(picture).find(Boolean), supported: props.allEvents.length > 0 },
    { id: 'benefits' as const, label: 'SATHI Benefits', subtitle: 'Offers at partner places', image: partners.filter(hasBenefit).map(picture).find(Boolean), supported: partners.some(hasBenefit) },
  ].filter(item => item.supported);
  const placeCategory = ['food', 'stays', 'benefits', 'places'].includes(category);
  const visibleMarkers = category === 'activities' ? markers.filter(marker => marker.type === 'activity')
    : category === 'events' ? markers.filter(marker => marker.type === 'event' && events.some(event => `event:${event.id}` === marker.id))
      : placeCategory ? [] : markers;
  // Search/category changes update pins without resetting a user's pan or zoom.
  const [mapCenter, setMapCenter] = useState<MapMarker['position']>();
  const centeredCity = useRef<string | null>(null);
  useEffect(() => {
    if (centeredCity.current !== city && markers.length) {
      setMapCenter(markers[0].position);
      centeredCity.current = city;
    }
  }, [city, markers]);
  const previewPlaces = matchingPartners.filter(hasBenefit);
  const shownPlaces = category === 'all' ? (previewPlaces.length ? previewPlaces : matchingPartners).slice(0, 3) : places;
  const placeTitle = category === 'food' ? 'Eat & Drink' : category === 'stays' ? 'Stay Nearby'
    : category === 'benefits' || (category === 'all' && previewPlaces.length) ? 'Places with SATHI Benefits' : 'Local places';
  const showActivities = category === 'all' || category === 'activities';
  const showPlaces = category === 'all' || placeCategory;
  const showEvents = category === 'all' || category === 'events';
  const filtered = Boolean(q || city !== 'All' || category !== 'all');

  return <div className="explore-page">
    <header className="explore-heading"><h1>Explore</h1><p>Discover places, activities and experiences around you.</p></header>
    <div className="explore-search-row">
      <label className="explore-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search Explore</span>
        <input type="search" value={search} onChange={event => props.onSearch(event.target.value)} placeholder="Places, activities or events" />
      </label>
      <label className="explore-location"><MapPin size={17} aria-hidden="true" /><span className="sr-only">Explore location</span>
        <select value={city} onChange={event => props.onCity(event.target.value)}>
          <option value="All">All cities</option>{['Kathmandu', 'Pokhara', 'Patan', 'Bhaktapur', 'Nagarkot', 'Chitwan'].map(value => <option key={value}>{value}</option>)}
        </select>
      </label>
    </div>

    <nav className="explore-category-rail" aria-label="Discover by category">
      {categories.map(item => <button type="button" key={item.id} aria-pressed={category === item.id} className="explore-category-card" onClick={() => props.onCategory(category === item.id ? 'all' : item.id)}>
        <SafeImage src={item.image} alt="" className="explore-category-photo" fallbackType="thumbnail" />
        <span className="explore-category-caption"><strong>{item.label}</strong><small>{item.subtitle}</small></span>
      </button>)}
    </nav>
    {filtered && <div className="explore-filter-summary"><p>{category === 'all' ? 'All discoveries' : categories.find(item => item.id === category)?.label ?? 'Local places'}{city !== 'All' ? ` · ${city}` : ''}{q ? ` · “${search.trim()}”` : ''}</p>
      <button type="button" className="explore-text-action" onClick={() => { props.onSearch(''); props.onCity('All'); props.onCategory('all'); }}><X size={14} aria-hidden="true" />Clear filters</button>
    </div>}

    <section className="explore-map-section" aria-label="Explore map">
      <SectionHeading title="Explore the map" description={placeCategory ? 'Partner map locations are not available yet. Browse places below.' : `${visibleMarkers.length} mapped listings · locations shared by listings`} />
      <MapPreview center={mapCenter} markers={visibleMarkers} onMarkerClick={props.onMarkerClick} height="var(--explore-map-height)" className="explore-map-canvas" presentation="explore" />
      {!placeCategory && !visibleMarkers.length && <p className="explore-map-note">No mapped locations for these results. You can still explore the cards below.</p>}
    </section>

    {showActivities && <section id="activities-section" aria-label="Activities to explore">
      <SectionHeading title={category === 'activities' ? 'Things to Do' : city !== 'All' ? `Explore ${city}` : 'Worth exploring'} description="Activities and experiences for your next day out."
        action={category === 'all' ? 'See all activities' : undefined} onAction={props.onAllActivities} />
      {category === 'all' && <SourceFeedback page={props.activityPage} label="activities" />}
      {activities.length ? <div className="explore-content-grid">{(category === 'all' ? activities.slice(0, 3) : activities).map(activity => <ActivityCard key={activity.id} activity={activity} />)}</div>
        : !props.activityPage.loading && !props.activityPage.error && <p className="explore-empty">No activities match yet. Try another search or city.</p>}
      {category === 'activities' && <DiscoveryPageControl {...props.activityPage} source="activities" loaded={props.allActivities.length} matches={activities.length} />}
    </section>}

    {showPlaces && <section id="places" aria-label="Explore partner places">
      <SectionHeading title={placeTitle} description={category === 'food' ? 'Find a spot for coffee, a meal or a catch-up.' : category === 'stays' ? 'Find a place to stay in your chosen city.' : 'Partner-listed offers. Confirm availability and terms with the venue.'}
        action={category === 'all' ? 'See all places' : undefined} onAction={() => props.onCategory('places')} />
      {category === 'all' && <SourceFeedback page={props.partnerPage} label="places" />}
      {shownPlaces.length ? <div className="explore-content-grid">{shownPlaces.map(partner => <PartnerCard key={partner.id} partner={partner} />)}</div>
        : !props.partnerPage.loading && !props.partnerPage.error && <p className="explore-empty">No places match yet. Try another search or city.</p>}
      {placeCategory && <DiscoveryPageControl {...props.partnerPage} source="places" loaded={partners.length} matches={places.length} />}
    </section>}

    {showEvents && <section id="events" aria-label="Things happening">
      <SectionHeading title="Things happening" description="Upcoming events to put in your calendar." action="See all events" onAction={props.onAllEvents} />
      {(category === 'all' || events.length >= 3) && <SourceFeedback page={props.eventPage} label="events" />}
      {events.length ? <div className="explore-content-grid">{events.slice(0, 3).map(event => <article key={event.id} className="explore-content-card">
        <SafeImage src={picture(event)} alt={event.title} className="explore-card-photo" fallbackType="thumbnail" />
        <div className="explore-card-body"><p className="explore-card-kind">{text(event.category) || 'Event'}</p><h3>{event.title}</h3>
          <p className="explore-card-meta"><CalendarDays size={14} aria-hidden="true" />{event.date}{text(event.time) ? ` · ${event.time}` : ''}</p>
          {event.location && <p className="explore-card-meta"><MapPin size={14} aria-hidden="true" />{event.location}</p>}
          <button type="button" className="explore-card-action" aria-label={`View event: ${event.title}`} onClick={() => props.onOpenEvent(event.id)}>View event<ArrowRight size={16} aria-hidden="true" /></button>
        </div>
      </article>)}</div> : !props.eventPage.loading && !props.eventPage.error && <p className="explore-empty">No upcoming events in these results. See all events for more.</p>}
      {category === 'events' && events.length < 3 && <DiscoveryPageControl {...props.eventPage} source="events" loaded={props.allEvents.length} matches={events.length} />}
    </section>}
    <div className="explore-deeper"><span>More local perspectives</span><button type="button" className="explore-text-action" onClick={props.onCommunity}>From the community<ArrowRight size={16} aria-hidden="true" /></button></div>
  </div>;
}
