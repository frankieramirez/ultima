'use client';

import styled from 'styled-components';
import { css } from '@emotion/react';
import clsx from 'clsx';
import './separator.css';

const Line = styled.hr``;

function Separator() {
  return <Line className={clsx('a', css`margin: 0;`)} />;
}

export { Separator };
