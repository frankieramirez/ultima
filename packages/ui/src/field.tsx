'use client';

import { Field as BaseField } from '@base-ui/react/field';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-2'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  label: {
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
  description: {
    color: color['--ult-color-text-muted'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-2'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  error: {
    color: color['--ult-color-danger-text'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-2'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  item: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'row',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-3'],
    lineHeight: font['--ult-font-leading-none'],
    margin: 0,
  },
});

type FieldRootProps = PartProps<ComponentProps<typeof BaseField.Root>>;
type FieldLabelProps = PartProps<ComponentProps<typeof BaseField.Label>>;
type FieldDescriptionProps = PartProps<ComponentProps<typeof BaseField.Description>>;
type FieldErrorProps = PartProps<ComponentProps<typeof BaseField.Error>>;
type FieldItemProps = PartProps<ComponentProps<typeof BaseField.Item>>;
type FieldControlProps = ComponentProps<typeof BaseField.Control>;
type FieldValidityProps = ComponentProps<typeof BaseField.Validity>;

function Root({ style, ...props }: FieldRootProps) {
  return <BaseField.Root {...props} {...stylex.props(styles.root, style)} />;
}

function Label({ style, ...props }: FieldLabelProps) {
  return <BaseField.Label {...props} {...stylex.props(styles.label, style)} />;
}

function Description({ style, ...props }: FieldDescriptionProps) {
  return <BaseField.Description {...props} {...stylex.props(styles.description, style)} />;
}

function Error({ style, ...props }: FieldErrorProps) {
  return <BaseField.Error {...props} {...stylex.props(styles.error, style)} />;
}

function Item({ style, ...props }: FieldItemProps) {
  return <BaseField.Item {...props} {...stylex.props(styles.item, style)} />;
}

const Field = {
  Root,
  Label,
  Description,
  Error,
  Item,
  Control: BaseField.Control,
  Validity: BaseField.Validity,
};

export {
  Field,
  type FieldRootProps,
  type FieldLabelProps,
  type FieldDescriptionProps,
  type FieldErrorProps,
  type FieldItemProps,
  type FieldControlProps,
  type FieldValidityProps,
};
