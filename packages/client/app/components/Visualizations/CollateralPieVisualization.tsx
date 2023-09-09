import { Cell, Pie, PieChart } from 'recharts';
import { GetCollateralTokensQuery } from '../../generated/gql-types';
import { roundCurrency } from '../../utils/math';

type Props = {
  borrowerCollateralTokens: (GetCollateralTokensQuery['getCollateralTokens'][number] & {
    chartColor?: string;
    troveValueUSD: number;
  })[];
};

const renderCustomizedLabel = (svgPropsAndData: any) => {
  // has all the spread data and some props from the library
  const { x, y, cx, troveValueUSD, chartColor, token } = svgPropsAndData;
  const isRight = x > cx;

  return (
    <g id="group1">
      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" x={isRight ? x + 15 : x - 55} y={y - 15}>
        <path
          fill={chartColor}
          d="M4 0a6.449 6.449 0 0 0 4 4 6.449 6.449 0 0 0-4 4 6.449 6.449 0 0 0-4-4 6.449 6.449 0 0 0 4-4Z"
        />
      </svg>
      <text
        fill="#504D59"
        x={isRight ? x + 28 : x - 10}
        y={y - 10}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
      >
        {token.symbol}
      </text>
      <text
        fill={chartColor}
        x={isRight ? x + 15 : x - 10}
        y={y + 10}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
      >
        {roundCurrency(troveValueUSD, 5)}
      </text>
    </g>
  );
};

function CollateralPieVisualization({ borrowerCollateralTokens }: Props) {
  return (
    <PieChart width={360} height={280} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
      <Pie
        animationDuration={1000}
        data={borrowerCollateralTokens}
        dataKey="troveValueUSD"
        nameKey="token.symbol"
        innerRadius={90}
        outerRadius={92}
        paddingAngle={1}
        label={renderCustomizedLabel}
        labelLine={{ stroke: '#504D59', strokeWidth: 2 }}
      >
        {borrowerCollateralTokens.map(({ token, chartColor }) => (
          <Cell stroke="transparent" key={token.address} fill={chartColor} />
        ))}
      </Pie>
    </PieChart>
  );
}

export default CollateralPieVisualization;
