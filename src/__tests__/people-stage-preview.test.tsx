import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { PEOPLE_FIXTURES, TEST_CATEGORIES, filterTestPeople } from '../dev/peopleFixtures';
import { PeopleStagePreview } from '../dev/PeopleStagePreview';
import { readFileSync } from 'node:fs';

afterEach(cleanup);

it('provides six fictional people per category and eight per planned mode, without real identities or trust claims', () => {
  expect(PEOPLE_FIXTURES).toHaveLength(24);
  expect(new Set(PEOPLE_FIXTURES.map(person => person.id)).size).toBe(24);
  for (const category of TEST_CATEGORIES) expect(filterTestPeople({ category })).toHaveLength(6);
  for (const mode of ['free_friend', 'local_host', 'guide'] as const) expect(filterTestPeople({ mode })).toHaveLength(8);
  for (const person of PEOPLE_FIXTURES) {
    expect(person.fixture).toBe(true); expect(person.id).toMatch(/^ui-fixture-/);
    expect(person.userId).toBeUndefined(); expect(person.isVerified).toBe(false);
    expect(person.rating).toBe(0); expect(person.reviewsCount).toBe(0);
    if (person.mode === 'free_friend') expect(person.hourlyRate).toBe(0);
    if (person.mode === 'guide') expect(person.agency).toContain('Fictional');
  }
});

it('combines mode/category/search/state and returns genuinely empty fixture results', () => {
  expect(filterTestPeople({ mode: 'free_friend', category: 'Coffee Buddy' })).toHaveLength(2);
  expect(filterTestPeople({ mode: 'local_host', state: 'review_pending' })).toHaveLength(4);
  expect(filterTestPeople({ mode: 'guide', state: 'unavailable' })).toHaveLength(4);
  expect(filterTestPeople({ query: 'no-such-test-person' })).toEqual([]);
});

it('changes the visible people by mode and restores the view with Reset', () => {
  render(<PeopleStagePreview />);
  fireEvent.click(screen.getByRole('button', { name: /Free Friends/ }));
  expect(screen.getByRole('status').textContent).toBe('8 of 24 test companions');
  expect(screen.getAllByRole('article')).toHaveLength(8);
  fireEvent.change(screen.getByLabelText('Search test companions'), { target: { value: 'no-such-test-person' } });
  expect(screen.getByText('No test companions match')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));
  expect(screen.getAllByRole('article')).toHaveLength(24);
});

it('opens a labelled test profile with disabled real-world actions and closes it', () => {
  render(<PeopleStagePreview />);
  fireEvent.click(screen.getByRole('button', { name: /Free Friends/ }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Preview' })[0]);
  const detail = screen.getByRole('region', { name: 'Test profile details' });
  expect(within(detail).getByText('FICTIONAL PROFILE PREVIEW')).toBeTruthy();
  expect((within(detail).getByRole('button', { name: 'Hangout requests unavailable in preview' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Close test profile' }));
  expect(screen.queryByRole('region', { name: 'Test profile details' })).toBeNull();
});

it('keeps the fixture entry development-only and outside the real app navigation', () => {
  const entry = readFileSync('src/dev/peoplePreviewMain.tsx', 'utf8');
  expect(entry).toContain('if (import.meta.env.DEV)');
  expect(entry).not.toMatch(/AppProvider|firebase/);
  expect(readFileSync('src/App.tsx', 'utf8')).not.toMatch(/PeopleStagePreview|peopleFixtures/);
  expect(readFileSync('src/ClientApp.tsx', 'utf8')).not.toContain('/dev/people-preview.html');
  expect(readFileSync('src/dev/PeopleStagePreview.tsx', 'utf8')).not.toMatch(/from ['"].*(firebase|repositories|AppContext)/);
});
