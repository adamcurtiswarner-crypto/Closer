import {
  THERAPIST_RESOURCES,
  RESOURCE_CATEGORIES,
  getResourcesByCategory,
  getCategoryMeta,
} from '../config/therapistResources';

describe('therapistResources', () => {
  describe('getResourcesByCategory', () => {
    it('returns crisis support resources', () => {
      const resources = getResourcesByCategory('crisis_support');
      expect(resources.length).toBeGreaterThan(0);
      resources.forEach((r) => {
        expect(r.category).toBe('crisis_support');
      });
    });

    it('returns only books for books category', () => {
      const resources = getResourcesByCategory('books');
      expect(resources.length).toBeGreaterThan(0);
      resources.forEach((r) => {
        expect(r.category).toBe('books');
      });
    });

    it('returns online therapy resources', () => {
      const resources = getResourcesByCategory('online_therapy');
      expect(resources.length).toBeGreaterThan(0);
      resources.forEach((r) => {
        expect(r.category).toBe('online_therapy');
      });
    });
  });

  describe('getCategoryMeta', () => {
    it('returns correct metadata for online_therapy', () => {
      const meta = getCategoryMeta('online_therapy');
      expect(meta).not.toBeNull();
      expect(meta!.value).toBe('online_therapy');
      expect(meta!.label).toBe('Online Therapy');
      expect(meta!.icon).toBeDefined();
      expect(meta!.description).toBeDefined();
    });

    it('returns null for invalid category', () => {
      const meta = getCategoryMeta('invalid' as any);
      expect(meta).toBeNull();
    });
  });

  describe('data integrity', () => {
    it('all resources have required fields', () => {
      THERAPIST_RESOURCES.forEach((resource) => {
        expect(resource.id).toBeTruthy();
        expect(resource.name).toBeTruthy();
        expect(resource.url).toBeTruthy();
        expect(resource.category).toBeTruthy();
        expect(resource.description).toBeTruthy();
        expect(typeof resource.isFree).toBe('boolean');
      });
    });

    it('all categories have at least one resource', () => {
      RESOURCE_CATEGORIES.forEach((category) => {
        const resources = getResourcesByCategory(category.value);
        expect(resources.length).toBeGreaterThan(0);
      });
    });
  });
});
