import { max } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';

const values = [1, 2, 3];
const y = scaleLinear().domain([0, max(values) ?? 0]).range([0, 1]);

export function Region() {
  return <svg aria-hidden="true"><path d={line<number>((value, index) => index).y((value) => y(value))(values) ?? ''} /></svg>;
}
