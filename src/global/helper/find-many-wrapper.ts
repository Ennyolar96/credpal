import { Brackets, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

const operatorMap: Record<string, string> = {
  $eq: '=',
  $ne: '!=',
  $lt: '<',
  $lte: '<=',
  $gt: '>',
  $gte: '>=',
  $like: 'LIKE',
  $in: 'IN',
  $nin: 'NOT IN',
  $between: 'BETWEEN',
  $min: 'MIN',
  $max: 'MAX',
  $avg: 'AVG',
  $sum: 'SUM',
};

export async function getAggregateValue(
  connection: any,
  tableName: string,
  field: string,
  aggregate: 'MIN' | 'MAX' | 'AVG' | 'SUM',
): Promise<number> {
  const result = await connection
    .createQueryBuilder()
    .select(`${aggregate}("${field}")`, 'value')
    .from(tableName)
    .getRawOne();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return result.value;
}

// const logger = new Logger('FindManyWrapper');
export function buildFindManyQuery<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  filters: Record<string, any> = {},
  search?: string,
  searchFields: string[] = [],
  relations: string[] = [],
  sort: string[] = ['updatedAt'], //'updatedAt:DESC'
  castToTextFields: string[] = [],
): SelectQueryBuilder<T> {
  let paramCount = 0;

  for (const [field, condition] of Object.entries(filters)) {
    if (condition === null || condition === undefined || condition === '')
      continue;

    const paramKey = `${field}_${paramCount++}`;

    if (typeof condition !== 'object' || Array.isArray(condition)) {
      if (Array.isArray(condition)) {
        qb.andWhere(`${alias}.${field} IN (:...${paramKey})`, {
          [paramKey]: condition,
        });
      } else {
        qb.andWhere(`${alias}.${field} = :${paramKey}`, {
          [paramKey]: condition,
        });
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      for (const [opKey, opValue] of Object.entries(condition)) {
        const sqlOp = operatorMap[opKey];
        if (!sqlOp) continue;

        const dynamicParamKey = `${field}_${opKey.replace('$', '')}_${paramCount++}`;

        if (sqlOp === 'BETWEEN') {
          if (Array.isArray(opValue) && opValue.length === 2) {
            qb.andWhere(
              `${alias}.${field} BETWEEN :${dynamicParamKey}Start AND :${dynamicParamKey}End`,
              {
                [`${dynamicParamKey}Start`]: opValue[0],
                [`${dynamicParamKey}End`]: opValue[1],
              },
            );
          }
        } else if (['IN', 'NOT IN'].includes(sqlOp)) {
          qb.andWhere(`${alias}.${field} ${sqlOp} (:...${dynamicParamKey})`, {
            [dynamicParamKey]: opValue,
          });
        } else if (['MIN', 'MAX', 'AVG', 'SUM'].includes(sqlOp)) {
          qb.andWhere(`${alias}.${field} = :${dynamicParamKey}`, {
            [dynamicParamKey]: opValue,
          });
        } else {
          qb.andWhere(`${alias}.${field} ${sqlOp} :${dynamicParamKey}`, {
            [dynamicParamKey]: opValue,
          });
        }
      }
    }
  }

  if (search && searchFields.length > 0) {
    qb.andWhere(
      new Brackets((qb2) => {
        for (const field of searchFields) {
          let fieldAlias = alias;
          let column = field;

          // Support dot notation for joined fields
          if (field.includes('.')) {
            [fieldAlias, column] = field.split('.');
          }

          // Check if this field should be cast to text
          if (castToTextFields.includes(column)) {
            qb2.orWhere(`CAST(${fieldAlias}.${column} AS TEXT) ILIKE :search`, {
              search: `%${search}%`,
            });
          } else {
            qb2.orWhere(`${fieldAlias}.${column} ILIKE :search`, {
              search: `%${search}%`,
            });
          }
        }
      }),
    );
  }

  for (const rel of relations) {
    qb.leftJoinAndSelect(`${alias}.${rel}`, rel);
  }

  for (const sortItem of sort) {
    const [field, direction = 'DESC'] = sortItem.split(':');
    qb.addOrderBy(
      `${alias}.${field}`,
      direction.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
    );
  }

  return qb;
}

export async function FindManyWrapper<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  page = 1,
  limit = 30,
): Promise<{
  data: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}> {
  const offset = (page - 1) * limit;
  const [data, totalCount] = await qb
    .skip(offset)
    .take(limit)
    .getManyAndCount();

  const currentPage = page;
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // logger.debug('Generated SQL:', qb.getSql());
  // logger.debug('Query Parameters:', JSON.stringify(qb.getQueryAndParameters()));

  return {
    data,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
}
