import { SqlParameter } from "@azure/cosmos";

class QB {
  private query: { name: string };
  private params: SqlParameter[];
  private static globalParamCounter = 0; // Static counter to ensure unique param names

  constructor(
    query: { name: string } = { name: "" },
    params: SqlParameter[] = []
  ) {
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

  eq(field: {name: string}, value: number | string) {
    const param = this.addParam(value);
    return new QB({ name: `c.${field.name} = ${param.name}` }, [
      ...this.params,
      param,
    ]);
  }

  gt(field: {name: string}, value: number) {
    const param = this.addParam(value);
    return new QB({ name: `c.${field.name} > ${param.name}` }, [
      ...this.params,
      param,
    ]);
  }

  gte(field: {name: string}, value: number) {
    const param = this.addParam(value);
    return new QB({ name: `c.${field.name} >= ${param.name}` }, [
      ...this.params,
      param,
    ]);
  }

  lt(field: {name: string}, value: number) {
    const param = this.addParam(value);
    return new QB({ name: `c.${field.name} < ${param.name}` }, [
      ...this.params,
      param,
    ]);
  }

  lte(field: {name: string}, value: number) {
    const param = this.addParam(value);
    return new QB({ name: `c.${field.name} <= ${param.name}` }, [
      ...this.params,
      param,
    ]);
  }

  inArray(field: {name: string}, values: (number | string)[]) {
    const params = values.map((v) => ({
      name: this.nextParamName(),
      value: v,
    }));
    const placeholders = params.map((p) => p.name).join(", ");
    return new QB({ name: `c.${field.name} IN (${placeholders})` }, [
      ...this.params,
      ...params,
    ]);
  }

  ieq(field: {name: string}, value: string) {
    const param = this.addParam(value.toLowerCase());
    return new QB({ name: `LOWER(c.${field.name}) = ${param.name}` }, [
      ...this.params,
      param,
    ]);
  }

  ilike(field: {name: string}, value: string) {
    const param = this.addParam(value.toLowerCase());
    return new QB({ name: `CONTAINS(LOWER(c.${field.name}), ${param.name})` }, [
      ...this.params,
      param,
    ]);
  }

  ne(field: {name: string}, value: number | string) {
    const param = this.addParam(value);
    return new QB({ name: `c.${field.name} != ${param.name}` }, [
      ...this.params,
      param,
    ]);
  }

  and(...conditions: QB[]) {
    const combinedQuery = conditions
      .map((c) => `(${c.query.name})`)
      .join(" AND ");
    const combinedParams = [
      ...this.params,
      ...conditions.flatMap((c) => c.params),
    ];
    return new QB({ name: combinedQuery }, combinedParams);
  }

  or(...conditions: QB[]) {
    const combinedQuery = conditions
      .map((c) => `(${c.query.name})`)
      .join(" OR ");
    const combinedParams = [
      ...this.params,
      ...conditions.flatMap((c) => c.params),
    ];
    return new QB({ name: combinedQuery }, combinedParams);
  }

  build() {
    return {
      query: this.query.name,
      params: this.params,
    };
  }
}

const qb = () => new QB();

export { QB, qb };
