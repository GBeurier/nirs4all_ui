import type { LibraryGroup } from './ComponentLibrary';

// Type definitions for JSON structure
export interface ComponentLibraryJSON {
  categories: CategoryDefinition[];
  subcategories: SubcategoryDefinition[];
  components: ComponentDefinition[];
}

export interface CategoryDefinition {
  id: string;
  label: string;
  featherIcon?: string;
  description: string;
  className: string;
  color: string;
  bgColor: string;
}

export interface SubcategoryDefinition {
  id: string;
  label: string;
  categoryId: string;
  description: string;
}

export interface ComponentDefinition {
  id: string;
  label: string;
  shortName: string;
  subcategoryId: string;
  description: string;
  nodeType: 'regular' | 'container' | 'generation';
  allowedChildren: string[];
  defaultParams: Record<string, any>;
  editableParams: ParamDefinition[];
  generationMode: 'in-place' | 'out' | 'generator';
  classPath?: string;
  functionPath?: string;
  framework?: string;
  tags?: string[];
}

export interface ParamDefinition {
  name: string;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'select';
  description: string;
  default: any;
  options?: string[];
}

let libraryCache: ComponentLibraryJSON | null = null;

// Load library from JSON
export async function loadComponentLibrary(): Promise<ComponentLibraryJSON> {
  if (libraryCache) {
    return libraryCache;
  }

  try {
    const response = await fetch('/component-library.json');
    if (!response.ok) {
      throw new Error(`Failed to load component library: ${response.statusText}`);
    }
    libraryCache = await response.json();
    return libraryCache as ComponentLibraryJSON;
  } catch (error) {
    console.error('Error loading component library:', error);
    // Return empty library as fallback
    return {
      categories: [],
      subcategories: [],
      components: [],
    };
  }
}

// Convert JSON to LibraryGroup format for UI
export function convertToLibraryGroups(library: ComponentLibraryJSON): LibraryGroup[] {
  return library.categories.map((category) => {
    const subcategories = library.subcategories
      .filter((sub) => sub.categoryId === category.id)
      .map((sub) => {
        const items = library.components
          .filter((comp) => comp.subcategoryId === sub.id)
          .map((comp) => ({
            id: comp.id,
            label: comp.label,
            shortName: comp.shortName,
            description: comp.description,
          }));

        return {
          id: sub.id,
          label: sub.label,
          items,
        };
      });

    return {
      id: category.id,
      label: category.label,
      featherIcon: category.featherIcon,
      description: category.description,
      className: category.className,
      color: category.color,
      bgColor: category.bgColor,
      subgroups: subcategories,
    };
  });
}

// Helper to find component by ID
export function findComponentById(
  library: ComponentLibraryJSON,
  id: string
): (ComponentDefinition & { category: CategoryDefinition; subcategory: SubcategoryDefinition }) | null {
  const component = library.components.find((c) => c.id === id);
  if (!component) return null;

  const subcategory = library.subcategories.find((s) => s.id === component.subcategoryId);
  if (!subcategory) return null;

  const category = library.categories.find((c) => c.id === subcategory.categoryId);
  if (!category) return null;

  return {
    ...component,
    category,
    subcategory,
  };
}

// Check if a node type supports children
export function supportsChildren(library: ComponentLibraryJSON, componentId: string): boolean {
  const component = library.components.find((c) => c.id === componentId);
  return component?.nodeType === 'container' || component?.nodeType === 'generation';
}

// Check if a node is a generator
export function isGeneratorNode(library: ComponentLibraryJSON, componentId: string): boolean {
  const component = library.components.find((c) => c.id === componentId);
  return component?.nodeType === 'generation';
}

// Check if a child is allowed in a parent
export function isChildAllowed(
  library: ComponentLibraryJSON,
  parentId: string,
  childId: string
): boolean {
  const parent = library.components.find((c) => c.id === parentId);
  if (!parent) return false;

  const child = findComponentById(library, childId);
  if (!child) return false;

  // If parent allows all children
  if (parent.allowedChildren.includes('*')) return true;

  // Check if child is in allowed list
  for (const rule of parent.allowedChildren) {
    if (rule === childId) return true;

    if (rule.startsWith('category:')) {
      const categoryId = rule.slice('category:'.length);
      if (child.category.id === categoryId) return true;
    }

    if (rule.startsWith('subcategory:')) {
      const subcategoryId = rule.slice('subcategory:'.length);
      if (child.subcategory.id === subcategoryId) return true;
    }
  }

  return false;
}

// Get category info for a component
export function getCategoryInfo(
  library: ComponentLibraryJSON,
  componentId: string
): CategoryDefinition | null {
  const component = library.components.find((c) => c.id === componentId);
  if (!component) return null;

  const subcategory = library.subcategories.find((s) => s.id === component.subcategoryId);
  if (!subcategory) return null;

  return library.categories.find((c) => c.id === subcategory.categoryId) || null;
}
