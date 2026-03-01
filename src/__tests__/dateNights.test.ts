import {
  DATE_NIGHT_CATEGORIES,
  DATE_NIGHT_IDEAS,
  getIdeasByCategory,
  getIdeaById,
} from '../config/dateNightIdeas';

describe('dateNightIdeas config', () => {
  describe('DATE_NIGHT_CATEGORIES', () => {
    it('has 6 categories', () => {
      expect(DATE_NIGHT_CATEGORIES).toHaveLength(6);
    });

    it('each category has key, label, and icon', () => {
      for (const cat of DATE_NIGHT_CATEGORIES) {
        expect(cat.key).toBeTruthy();
        expect(cat.label).toBeTruthy();
        expect(cat.icon).toBeTruthy();
      }
    });

    it('includes expected category keys', () => {
      const keys = DATE_NIGHT_CATEGORIES.map((c) => c.key);
      expect(keys).toContain('at_home');
      expect(keys).toContain('out_about');
      expect(keys).toContain('adventure');
      expect(keys).toContain('creative');
      expect(keys).toContain('food_drink');
      expect(keys).toContain('free_budget');
    });
  });

  describe('DATE_NIGHT_IDEAS', () => {
    it('has 48 ideas', () => {
      expect(DATE_NIGHT_IDEAS).toHaveLength(48);
    });

    it('all IDs are unique', () => {
      const ids = DATE_NIGHT_IDEAS.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every idea has required fields', () => {
      for (const idea of DATE_NIGHT_IDEAS) {
        expect(idea.id).toBeTruthy();
        expect(idea.title).toBeTruthy();
        expect(idea.description).toBeTruthy();
        expect(idea.category).toBeTruthy();
        expect(idea.costTier).toBeTruthy();
        expect(typeof idea.durationMinutes).toBe('number');
      }
    });

    it('all ideas reference a valid category', () => {
      const validCategories = DATE_NIGHT_CATEGORIES.map((c) => c.key);
      for (const idea of DATE_NIGHT_IDEAS) {
        expect(validCategories).toContain(idea.category);
      }
    });

    it('all cost tiers are valid', () => {
      const validTiers = ['free', '$', '$$', '$$$'];
      for (const idea of DATE_NIGHT_IDEAS) {
        expect(validTiers).toContain(idea.costTier);
      }
    });

    it('has 8 ideas per category', () => {
      const categoryKeys = DATE_NIGHT_CATEGORIES.map((c) => c.key);
      for (const key of categoryKeys) {
        const count = DATE_NIGHT_IDEAS.filter((i) => i.category === key).length;
        expect(count).toBe(8);
      }
    });
  });

  describe('getIdeasByCategory', () => {
    it('returns only ideas from the requested category', () => {
      const homeIdeas = getIdeasByCategory('at_home');
      expect(homeIdeas.length).toBe(8);
      for (const idea of homeIdeas) {
        expect(idea.category).toBe('at_home');
      }
    });

    it('returns empty array for custom category (no static ideas)', () => {
      const customIdeas = getIdeasByCategory('custom');
      expect(customIdeas).toHaveLength(0);
    });
  });

  describe('getIdeaById', () => {
    it('returns the idea for a valid ID', () => {
      const idea = getIdeaById('at_home_1');
      expect(idea).toBeDefined();
      expect(idea!.title).toBe('Cook a meal from a new country');
    });

    it('returns undefined for an invalid ID', () => {
      expect(getIdeaById('nonexistent')).toBeUndefined();
    });
  });
});
