'use client';

import Select, { type GroupBase, type Props as SelectProps, type StylesConfig } from 'react-select';

export interface SelectOption {
  value: string;
  label: string;
}

const selectStyles: StylesConfig<SelectOption, boolean, GroupBase<SelectOption>> = {
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    borderRadius: 8,
    borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(37, 99, 235, 0.1)' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#3b82f6' : '#cbd5e1',
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '2px 12px',
  }),
  input: (base) => ({
    ...base,
    color: '#0f172a',
  }),
  placeholder: (base) => ({
    ...base,
    color: '#94a3b8',
  }),
  singleValue: (base) => ({
    ...base,
    color: '#0f172a',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 10,
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)',
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 200,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#eff6ff' : '#ffffff',
    color: state.isSelected ? '#ffffff' : '#0f172a',
    cursor: 'pointer',
    ':active': {
      backgroundColor: state.isSelected ? '#2563eb' : '#dbeafe',
    },
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: '#1d4ed8',
    fontWeight: 600,
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: '#1d4ed8',
    ':hover': {
      backgroundColor: '#dbeafe',
      color: '#1e40af',
    },
  }),
};

type AppSelectProps = Omit<SelectProps<SelectOption, boolean, GroupBase<SelectOption>>, 'styles'>;

export default function AppSelect(props: AppSelectProps) {
  return (
    <Select<SelectOption, boolean, GroupBase<SelectOption>>
      unstyled={false}
      styles={selectStyles}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      menuPosition="fixed"
      noOptionsMessage={() => 'No options found'}
      {...props}
    />
  );
}
