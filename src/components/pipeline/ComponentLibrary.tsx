import React from 'react';
import { Filter, Layers as LayersIcon, Cpu, Activity, List, ChevronDown } from 'feather-icons-react';

export interface LibraryItem {
  id: string;
  label: string;
  shortName?: string;
  description?: string;
}

export interface LibrarySubgroup {
  id: string;
  label: string;
  items: LibraryItem[];
}

export interface LibraryGroup {
  id: string;
  label: string;
  featherIcon?: string;
  description?: string;
  className: string;
  subgroups: LibrarySubgroup[];
}

const GROUP_ICONS: Record<string, any> = {
  preprocessing: Filter,
  feature_extraction: LayersIcon,
  model_training: Cpu,
  prediction: Activity,
  special: List,
};

const GROUP_ICON_COLORS: Record<string, string> = {
  preprocessing: 'text-blue-600',
  feature_extraction: 'text-green-600',
  model_training: 'text-purple-600',
  prediction: 'text-red-600',
  special: 'text-yellow-600',
};

const GROUP_HOVER_CLASSES: Record<string, string> = {
  preprocessing: 'hover:bg-blue-100',
  feature_extraction: 'hover:bg-green-100',
  model_training: 'hover:bg-purple-100',
  prediction: 'hover:bg-red-100',
  special: 'hover:bg-yellow-100',
};

const GROUP_ITEM_CLASSES: Record<string, string> = {
  preprocessing: 'bg-blue-50 border-blue-200 text-gray-700',
  feature_extraction: 'bg-green-50 border-green-200 text-gray-700',
  model_training: 'bg-purple-50 border-purple-200 text-gray-700',
  prediction: 'bg-red-50 border-red-200 text-gray-700',
  special: 'bg-yellow-50 border-yellow-300 text-gray-700',
};

interface ComponentLibraryProps {
  groups: LibraryGroup[];
  collapsedGroups: Set<string>;
  collapsedSubgroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
  onToggleSubgroup: (subgroupId: string) => void;
  onDragStart: (e: React.DragEvent, componentId: string) => void;
  onItemClick: (componentId: string) => void;
}

const ComponentLibrary: React.FC<ComponentLibraryProps> = ({
  groups,
  collapsedGroups,
  collapsedSubgroups,
  onToggleGroup,
  onToggleSubgroup,
  onDragStart,
  onItemClick,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 sticky top-6 overflow-auto max-h-[70vh]">
      <h2 className="text-lg font-semibold mb-4">Component Library</h2>
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Group header */}
            <button
              type="button"
              onClick={() => onToggleGroup(g.id)}
              aria-expanded={!collapsedGroups.has(g.id)}
              title={g.description || g.label}
              className={`w-full flex justify-between items-center p-4 ${g.className} ${GROUP_HOVER_CLASSES[g.id]} transition-colors cursor-pointer`}
            >
              <div className="flex items-center">
                {/* Use Feather icons (monochrome) - they're dope! */}
                {GROUP_ICONS[g.id] ? (
                  React.createElement(GROUP_ICONS[g.id], {
                    className: `mr-3 w-6 h-6 ${GROUP_ICON_COLORS[g.id]}`,
                    stroke: 'currentColor',
                    fill: 'none',
                  })
                ) : (
                  g.featherIcon && <span className="mr-3 text-2xl">{g.featherIcon}</span>
                )}
                <span className="font-medium text-gray-900">{g.label}</span>
              </div>
              <div className="text-sm font-medium">
                <ChevronDown
                  className={`w-5 h-5 transform transition-transform ${
                    collapsedGroups.has(g.id) ? '' : 'rotate-180'
                  }`}
                  aria-hidden
                />
              </div>
            </button>

            {/* Subgroups */}
            {!collapsedGroups.has(g.id) && (
              <div className="p-3 space-y-2">
                {g.subgroups.map((sg) => (
                  <div key={sg.id} className="mb-2">
                    <div
                      className={`pl-4 border-l-2 ${
                        g.id === 'preprocessing'
                          ? 'border-blue-200'
                          : g.id === 'feature_extraction'
                          ? 'border-green-200'
                          : g.id === 'model_training'
                          ? 'border-purple-200'
                          : g.id === 'prediction'
                          ? 'border-red-200'
                          : 'border-yellow-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onToggleSubgroup(sg.id)}
                        aria-expanded={!collapsedSubgroups.has(sg.id)}
                        className="w-full text-left text-sm font-medium text-gray-700 mb-2"
                      >
                        {sg.label}
                      </button>
                      {!collapsedSubgroups.has(sg.id) && (
                        <div className="pl-4 space-y-1">
                          {sg.items.map((item) => {
                            const isContainer = ['feature_augmentation', 'augmentation_sample', 'sequential', 'pipeline'].includes(item.id);
                            const isGenerator = item.id.startsWith('_') && item.id.endsWith('_');

                            return (
                              <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => onDragStart(e, item.id)}
                                onClick={() => onItemClick(item.id)}
                                className={`component-card ${GROUP_ITEM_CLASSES[g.id]} border rounded p-2 cursor-move text-sm transition-colors ${
                                  isContainer ? 'font-semibold border-2' : ''
                                } ${isGenerator ? 'italic border-dashed' : ''}`}
                                title={item.description || (isContainer ? 'Container - can hold child nodes' : isGenerator ? 'Generator node' : item.label)}
                              >
                                {item.label}
                                {isContainer && <span className="ml-1 text-xs">📦</span>}
                                {isGenerator && <span className="ml-1 text-xs">⚡</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ComponentLibrary;
