import {
  AlgebraicType,
  ProductType,
  SumType,
  ProductTypeElement,
} from "@clockworklabs/spacetimedb-sdk";
import * as GeneratedModule from "@/generated";
import { safeStringify } from "@/utils/serialization";
import { FieldMetadata } from "@/types/spacetime";

export class TypeAnalyzer {
  private typeCache = new Map<string, FieldMetadata[]>();

  analyzeAlgebraicType(type: AlgebraicType, name = ""): FieldMetadata[] {
    const cacheKey = safeStringify(type);

    if (this.typeCache.has(cacheKey)) {
      return this.typeCache.get(cacheKey)!;
    }

    let fields: FieldMetadata[] = [];

    if (type.isProductType()) {
      fields = this.analyzeProductType(type.product);
    } else if (type.isSumType()) {
      fields = this.analyzeSumType(type.sum, name);
    } else {
      fields = [this.createFieldFromPrimitive(type, name)];
    }

    // Enhance enum fields with constructors
    fields = fields.map((field) => this.enhanceEnumField(field));

    this.typeCache.set(cacheKey, fields);
    return fields;
  }

  private analyzeProductType(productType: ProductType): FieldMetadata[] {
    if (!productType.elements) return [];

    return productType.elements.map((element: ProductTypeElement) => ({
      name: element.name || "unknown",
      type: this.getTypeString(element.algebraicType),
      isOptional: this.isOptionalType(element.algebraicType),
      isArray: this.isArrayType(element.algebraicType),
      displayName: this.formatDisplayName(element.name || "unknown"),
      inputType: this.inferInputType(
        this.getTypeString(element.algebraicType),
        element.name || ""
      ),
      validation: this.generateValidation(
        this.getTypeString(element.algebraicType),
        element.name || ""
      ),
      enumValues: this.extractEnumValues(element.algebraicType),
    }));
  }

  private analyzeSumType(sumType: SumType, name: string): FieldMetadata[] {
    if (!sumType.variants) return [];

    const enumValues = sumType.variants.map((variant) => variant.name || "");

    return [
      {
        name: name || "variant",
        type: "enum",
        isOptional: false,
        isArray: false,
        displayName: this.formatDisplayName(name || "variant"),
        inputType: "select" as const,
        enumValues,
        validation: { required: true },
      },
    ];
  }

  private createFieldFromPrimitive(
    type: AlgebraicType,
    name: string
  ): FieldMetadata {
    const typeString = this.getTypeString(type);

    return {
      name: name || "value",
      type: typeString,
      isOptional: false,
      isArray: false,
      displayName: this.formatDisplayName(name || "value"),
      inputType: this.inferInputType(typeString, name),
      validation: this.generateValidation(typeString, name),
    };
  }

  private getTypeString(type: AlgebraicType): string {
    if (type.isSumType()) {
      const sumType = type.sum;

      // Check for Option type
      if (sumType.variants?.length === 2) {
        const variantNames = sumType.variants.map((v) => v.name?.toLowerCase());
        if (variantNames.includes("some") && variantNames.includes("none")) {
          const someVariant = sumType.variants.find(
            (v) => v.name?.toLowerCase() === "some"
          );
          if (someVariant?.algebraicType) {
            return this.getTypeString(someVariant.algebraicType);
          }
        }
      }

      return "enum";
    }

    const typeMap: Record<string, string> = {
      [AlgebraicType.Type.Bool]: "boolean",
      [AlgebraicType.Type.U8]: "u8",
      [AlgebraicType.Type.U16]: "u16",
      [AlgebraicType.Type.U32]: "u32",
      [AlgebraicType.Type.U64]: "u64",
      [AlgebraicType.Type.I8]: "i8",
      [AlgebraicType.Type.I16]: "i16",
      [AlgebraicType.Type.I32]: "i32",
      [AlgebraicType.Type.I64]: "i64",
      [AlgebraicType.Type.F32]: "f32",
      [AlgebraicType.Type.F64]: "f64",
      [AlgebraicType.Type.String]: "string",
      [AlgebraicType.Type.SumType]: "enum",
      [AlgebraicType.Type.ProductType]: "object",
    };

    if (type.type in typeMap) {
      return typeMap[type.type];
    }

    if (type.isArrayType()) {
      return `Array<${this.getTypeString(type.array)}>`;
    }

    if (type.isMapType()) {
      return `Map<${this.getTypeString(type.map.keyType)}, ${this.getTypeString(
        type.map.valueType
      )}>`;
    }

    // Special types
    if (type.isIdentity()) return "Identity";
    if (type.isConnectionId()) return "ConnectionId";
    if (type.isTimestamp()) return "Timestamp";
    if (type.isTimeDuration()) return "TimeDuration";
    if (type.isScheduleAt()) return "ScheduleAt";

    return "unknown";
  }

  private isOptionalType(type: AlgebraicType): boolean {
    if (type.isSumType() && type.sum.variants) {
      const variantNames = type.sum.variants.map((v) => v.name?.toLowerCase());
      return variantNames.includes("none") && variantNames.includes("some");
    }
    return false;
  }

  private isArrayType(type: AlgebraicType): boolean {
    return type.isArrayType();
  }

  private extractEnumValues(type: AlgebraicType): string[] | undefined {
    if (type.isSumType() && type.sum?.variants && !this.isOptionalType(type)) {
      return type.sum.variants.map((v) => v.name || "");
    }
    return undefined;
  }

  private inferInputType(
    typeString: string,
    fieldName: string
  ): FieldMetadata["inputType"] {
    const lowerName = fieldName.toLowerCase();

    if (typeString === "enum") return "select";
    if (typeString === "boolean") return "boolean";

    const patterns: Record<string, FieldMetadata["inputType"]> = {
      email: "email",
      mail: "email",
      password: "password",
      secret: "password",
      token: "password",
      url: "url",
      link: "url",
      website: "url",
      description: "textarea",
      content: "textarea",
      message: "textarea",
      comment: "textarea",
      bio: "textarea",
      about: "textarea",
    };

    for (const [pattern, inputType] of Object.entries(patterns)) {
      if (lowerName.includes(pattern)) return inputType;
    }

    if (
      lowerName.includes("date") ||
      lowerName.includes("time") ||
      lowerName.includes("created") ||
      lowerName.includes("updated") ||
      typeString === "Timestamp"
    ) {
      return "date";
    }

    if (/^[ui](8|16|32|64)$|^f(32|64)$/.test(typeString)) {
      return "number";
    }

    return "text";
  }

  private generateValidation(
    typeString: string,
    fieldName: string
  ): FieldMetadata["validation"] {
    const validation: FieldMetadata["validation"] = {};
    const lowerName = fieldName.toLowerCase();

    if (!lowerName.includes("optional") && !typeString.includes("Option")) {
      validation.required = true;
    }

    const numericLimits: Record<string, { min: number; max: number }> = {
      u8: { min: 0, max: 255 },
      u16: { min: 0, max: 65535 },
      u32: { min: 0, max: 4294967295 },
    };

    if (typeString in numericLimits) {
      const { min, max } = numericLimits[typeString];
      validation.min = min;
      validation.max = max;
    }

    if (typeString === "string") {
      if (lowerName.includes("email")) {
        validation.pattern = "^[^@]+@[^@]+\\.[^@]+$";
      } else if (lowerName.includes("url")) {
        validation.pattern = "^https?://.*";
      }
    }

    return validation;
  }

  private enhanceEnumField(field: FieldMetadata): FieldMetadata {
    if (field.type === "enum" && field.enumValues) {
      const enumConstructor = this.findEnumConstructor(
        field.name,
        field.enumValues
      );
      return { ...field, _enumConstructor: enumConstructor };
    }
    return field;
  }

  private findEnumConstructor(fieldName: string, enumValues: string[]): any {
    try {
      const exportedItems = Object.keys(GeneratedModule);

      const possibleEnums = exportedItems.filter((itemName) => {
        const item = (GeneratedModule as any)[itemName];

        if (typeof item === "function" || typeof item === "object") {
          return enumValues.some(
            (enumValue) =>
              item[enumValue] !== undefined ||
              typeof item[enumValue] === "function"
          );
        }
        return false;
      });

      for (const enumName of possibleEnums) {
        const EnumConstructor = (GeneratedModule as any)[enumName];
        const testValue = enumValues[0];

        try {
          if (EnumConstructor[testValue] !== undefined) {
            return EnumConstructor;
          }
        } catch {
          continue;
        }
      }
    } catch (error) {
      console.warn(
        `Failed to find enum constructor for field: ${fieldName}`,
        error
      );
    }

    return null;
  }

  private formatDisplayName(name: string): string {
    return name
      .split(/[_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
}
