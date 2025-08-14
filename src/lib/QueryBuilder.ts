import { SqlParameter } from "@azure/cosmos";

class QB {
  private query: string;
  private params: SqlParameter[];
  private static globalParamCounter = 0; // Static counter to ensure unique param names

  constructor(query: string = "", params: SqlParameter[] = []) {
    this.query = query;
    this.params = [...params];
  }

  private nextParamName() {
    return `@param${++QB.globalParamCounter}`;
  }

  private addParam(value: number | string): SqlParameter {
    return {
      name: this.nextParamName(),
      value: value,
    };
  }

  eq(field: string, value: number | string) {
    const param = this.addParam(value);
    return new QB(`c.${field} = ${param.name}`, [...this.params, param]);
  }

  gt(field: string, value: number) {
    const param = this.addParam(value);
    return new QB(`c.${field} > ${param.name}`, [...this.params, param]);
  }

  lt(field: string, value: number) {
    const param = this.addParam(value);
    return new QB(`c.${field} < ${param.name}`, [...this.params, param]);
  }

  inArray(field: string, values: (number | string)[]) {
    const params = values.map((v) => ({
      name: this.nextParamName(),
      value: v,
    }));
    const placeholders = params.map((p) => p.name).join(", ");
    return new QB(`c.${field} IN (${placeholders})`, [
      ...this.params,
      ...params,
    ]);
  }

  ieq(field: string, value: string) {
    const param = this.addParam(value.toLowerCase());
    return new QB(`LOWER(c.${field}) = ${param.name}`, [...this.params, param]);
  }

  ilike(field: string, value: string) {
    const param = this.addParam(value.toLowerCase());
    return new QB(`CONTAINS(LOWER(c.${field}), ${param.name})`, [
      ...this.params,
      param,
    ]);
  }

  ne(field: string, value: number | string) {
    const param = this.addParam(value);
    return new QB(`c.${field} != ${param.name}`, [...this.params, param]);
  }

  and(...conditions: QB[]) {
    const combinedQuery = conditions.map((c) => `(${c.query})`).join(" AND ");
    const combinedParams = [
      ...this.params,
      ...conditions.flatMap((c) => c.params),
    ];
    return new QB(combinedQuery, combinedParams);
  }

  or(...conditions: QB[]) {
    const combinedQuery = conditions.map((c) => `(${c.query})`).join(" OR ");
    const combinedParams = [
      ...this.params,
      ...conditions.flatMap((c) => c.params),
    ];
    return new QB(combinedQuery, combinedParams);
  }

  build() {
    return {
      query: this.query,
      params: this.params,
    };
  }
}

const qb = () => new QB();

export { QB, qb };
