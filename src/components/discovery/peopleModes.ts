import { Compass, HeartHandshake, MapPin, Users } from 'lucide-react';

/** Existing directory destinations; presentation never grants service eligibility. */
export const PEOPLE_MODES = [
  { id: 'all', label: 'All people', Icon: Users, summary: 'Find company for the things you enjoy.', description: '', comingSoon: false },
  { id: 'free_friend', label: 'Free Friends', Icon: HeartHandshake, summary: 'Meet over shared interests.', description: 'Meet over shared interests, with a hangout fee of NPR 0. Free Friend profiles and hangout requests are not available yet.', comingSoon: true },
  { id: 'local_host', label: 'Local Hosts', Icon: MapPin, summary: 'Explore with a local host.', description: 'Explore with a local host, with clear service options and pricing. The new Local Host service is not available yet.', comingSoon: true },
  { id: 'guide', label: 'Guides', Icon: Compass, summary: 'Find a guide for your journey.', description: 'Find credential-verified guides with a responsible agency. Verified guide and agency listings are not available yet.', comingSoon: true },
] as const;

export type PeopleMode = typeof PEOPLE_MODES[number]['id'];
export type PeopleView = PeopleMode | 'types';
