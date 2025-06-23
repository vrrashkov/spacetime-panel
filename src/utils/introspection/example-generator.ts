import { faker } from "@faker-js/faker";
import type { FieldMetadata } from "@/types/spacetime";

export class ExampleGenerator {
  static generateExampleArgs(fields: FieldMetadata[]): Record<string, any> {
    const example: Record<string, any> = {};

    fields.forEach((field) => {
      if (field.isOptional && Math.random() > 0.8) return;

      try {
        example[field.name] = this.generateExampleValue(field);
      } catch {
        example[field.name] = `fallback_${field.name}`;
      }
    });

    // Ensure at least some fields are populated
    if (Object.keys(example).length === 0 && fields.length > 0) {
      fields.slice(0, Math.min(3, fields.length)).forEach((field) => {
        try {
          example[field.name] = this.generateExampleValue(field);
        } catch {
          example[field.name] = `forced_${field.name}`;
        }
      });
    }

    return example;
  }

  private static generateExampleValue(field: FieldMetadata): any {
    const { type, name, enumValues, isArray } = field;

    let value = this.generateBaseValue(field);

    if (isArray) {
      const arrayLength = faker.number.int({ min: 1, max: 3 });
      return Array(arrayLength)
        .fill(null)
        .map(() => this.generateBaseValue(field));
    }

    return value;
  }

  private static generateBaseValue(field: FieldMetadata): any {
    const { type, name, enumValues, inputType } = field;

    if (enumValues?.length) {
      return faker.helpers.arrayElement(enumValues);
    }

    if (type === "boolean") return faker.datatype.boolean();

    if (this.isNumericType(type)) {
      return this.generateNumber(field);
    }

    if (type === "string") {
      return this.generateString(field);
    }

    if (type === "Identity") {
      return "0x" + faker.string.hexadecimal({ length: 64 }).slice(2);
    }

    if (type === "ConnectionId") {
      return faker.number.int({ min: 1, max: 1000000 });
    }

    if (type === "Timestamp") {
      return faker.date.recent().toISOString();
    }

    return `example_${name}`;
  }

  private static isNumericType(type: string): boolean {
    return /^[ui](8|16|32|64)$|^f(32|64)$/.test(type);
  }

  private static generateNumber(field: FieldMetadata): number {
    const { name, validation, type } = field;
    const lowerName = name.toLowerCase();

    const min = validation?.min || 0;
    const max = validation?.max || this.getTypeMax(type);

    const generators: Record<string, () => number> = {
      id: () => faker.number.int({ min: 1, max: Math.min(max, 999999) }),
      age: () => faker.number.int({ min: 1, max: Math.min(max, 120) }),
      count: () => faker.number.int({ min, max: Math.min(max, 1000) }),
      percentage: () => faker.number.int({ min: 0, max: 100 }),
      amount: () => faker.number.int({ min: 0, max: Math.min(max, 100000) }),
      score: () => faker.number.int({ min: 0, max: Math.min(max, 10000) }),
      level: () => faker.number.int({ min: 1, max: Math.min(max, 100) }),
    };

    for (const [key, generator] of Object.entries(generators)) {
      if (lowerName.includes(key)) return generator();
    }

    return faker.number.int({ min, max: Math.min(max, 1000) });
  }

  private static getTypeMax(type: string): number {
    const typeMaxes: Record<string, number> = {
      u8: 255,
      u16: 65535,
      u32: 4294967295,
      i8: 127,
      i16: 32767,
      i32: 2147483647,
    };
    return typeMaxes[type] || 1000;
  }

  private static generateString(field: FieldMetadata): string {
    const { name, inputType } = field;
    const lowerName = name.toLowerCase();

    if (field.enumValues?.length) {
      return faker.helpers.arrayElement(field.enumValues);
    }

    const stringGenerators: Record<string, () => string> = {
      email: () => faker.internet.email(),
      url: () => faker.internet.url(),
      password: () => faker.internet.password(),
      date: () => faker.date.recent().toISOString(),
      textarea: () => this.generateTextareaContent(lowerName),
    };

    if (stringGenerators[inputType]) {
      return stringGenerators[inputType]();
    }

    return this.generateContextualString(lowerName);
  }

  private static generateTextareaContent(lowerName: string): string {
    if (lowerName.includes("description")) return faker.lorem.paragraph();
    if (lowerName.includes("bio")) return faker.person.bio();
    if (lowerName.includes("content")) return faker.lorem.paragraphs(2);
    return faker.lorem.sentence();
  }

  private static generateContextualString(lowerName: string): string {
    const contextGenerators: Record<string, () => string> = {
      name: () => this.generateNameVariant(lowerName),
      address: () => this.generateAddressVariant(lowerName),
    };

    for (const [key, generator] of Object.entries(contextGenerators)) {
      if (lowerName.includes(key)) return generator();
    }

    return faker.lorem.words(2);
  }

  private static generateNameVariant(lowerName: string): string {
    if (lowerName.includes("first")) return faker.person.firstName();
    if (lowerName.includes("last")) return faker.person.lastName();
    if (lowerName.includes("user") || lowerName.includes("player"))
      return faker.internet.username();
    if (lowerName.includes("company")) return faker.company.name();
    return faker.person.fullName();
  }

  private static generateAddressVariant(lowerName: string): string {
    if (lowerName.includes("wallet") || lowerName.includes("eth")) {
      return faker.finance.ethereumAddress();
    }
    return faker.location.streetAddress();
  }
}
