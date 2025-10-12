import React, { type ComponentType, type SVGProps } from 'react';
import {
  Activity,
  BarChart2,
  Box,
  ChevronDown,
  Cpu,
  Crosshair,
  DivideSquare,
  GitBranch,
  Layers,
  Sliders,
  Target,
} from 'feather-icons-react';

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
  className?: string;
  color?: string;
  bgColor?: string;
  subgroups: LibrarySubgroup[];
}

const CATEGORY_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  augmentation: GitBranch,
  preprocessing: Sliders,
  feature_engineering: Layers,
  models_sklearn: BarChart2,
  models_deep: Cpu,
  validation: DivideSquare,
  targets: Crosshair,
  prediction: Target,
  utilities: Box,
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
        {groups.map((group) => {
          const iconColor = group.color ?? '#2563eb';
          const bgColor = group.bgColor ?? '#eef2ff';
          const itemBg = group.bgColor ?? '#f8fafc';

          const IconComponent = CATEGORY_ICONS[group.id] ?? Activity;

          return (
            <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => onToggleGroup(group.id)}
                aria-expanded={!collapsedGroups.has(group.id)}
                title={group.description || group.label}
                className={`w-full flex justify-between items-center p-4 border-l-4 transition-colors cursor-pointer hover:brightness-95 ${
                  group.className ?? ''
                }`}
                style={{
                  backgroundColor: bgColor,
                  borderLeftColor: iconColor,
                }}
              >
                <div className="flex items-center">
                  <IconComponent className="mr-3 w-6 h-6" color={iconColor} strokeWidth={2} />
                  <span className="font-medium" style={{ color: iconColor }}>
                    {group.label}
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 transform transition-transform ${
                    collapsedGroups.has(group.id) ? '' : 'rotate-180'
                  }`}
                  color={iconColor}
                  aria-hidden
                />
              </button>

              {!collapsedGroups.has(group.id) && (
                <div className="p-3 space-y-2">
                  {group.subgroups.map((subgroup) => (
                    <div key={subgroup.id} className="mb-2">
                      <div className="pl-4 border-l-2" style={{ borderColor: iconColor }}>
                        <button
                          type="button"
                          onClick={() => onToggleSubgroup(subgroup.id)}
                          aria-expanded={!collapsedSubgroups.has(subgroup.id)}
                          className="w-full text-left text-sm font-medium mb-2"
                          style={{ color: iconColor }}
                        >
                          {subgroup.label}
                        </button>

                        {!collapsedSubgroups.has(subgroup.id) && (
                          <div className="pl-4 space-y-1">
                            {subgroup.items.map((item) => {
                              const isContainer = [
                                'feature_augmentation',
                                'augmentation_sample',
                                'sequential',
                                'pipeline',
                                'y_processing',
                              ].includes(item.id);
                              const isGenerator =
                                item.id.startsWith('_') && item.id.endsWith('_');

                              return (
                                <div
                                  key={item.id}
                                  draggable
                                  onDragStart={(e) => onDragStart(e, item.id)}
                                  onClick={() => onItemClick(item.id)}
                                  className={`component-card border rounded p-2 cursor-move text-sm transition-colors hover:brightness-95 ${
                                    isContainer ? 'font-semibold border-2' : ''
                                  } ${isGenerator ? 'italic border-dashed' : ''}`}
                                  title={
                                    item.description ||
                                    (isContainer
                                      ? 'Container - can hold child nodes'
                                      : isGenerator
                                      ? 'Generator node'
                                      : item.label)
                                  }
                                  style={{
                                    backgroundColor: itemBg,
                                    borderColor: iconColor,
                                    color: '#1f2937',
                                  }}
                                >
                                  {item.label}
                                  {isContainer && (
                                    <span className="ml-1 text-xs text-gray-600" aria-hidden>
                                      📦
                                    </span>
                                  )}
                                  {isGenerator && (
                                    <span className="ml-1 text-xs text-gray-600" aria-hidden>
                                      ⚙
                                    </span>
                                  )}
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
          );
        })}
      </div>
    </div>
  );
};

export default ComponentLibrary;
