import React, { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Info,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Hash,
  Type,
  Calendar,
  Mail,
  Globe,
  Lock,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldMetadata } from "@/types/spacetime";

interface DynamicFormFieldProps {
  field: FieldMetadata;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  error?: string;
  showExample?: boolean;
}

const FieldIcon = ({
  inputType,
  type,
}: {
  inputType: string;
  type: string;
}) => {
  const iconMap = {
    email: Mail,
    url: Globe,
    password: Lock,
    textarea: FileText,
    date: Calendar,
    number: Hash,
    text: Type,
  };

  const Icon = iconMap[inputType as keyof typeof iconMap] || Type;
  return <Icon className="h-4 w-4 text-gray-400" />;
};

const TypeBadge = ({ field }: { field: FieldMetadata }) => {
  const getTypeColor = (type: string) => {
    if (type === "boolean")
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (type.includes("u") || type.includes("i"))
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    if (type.includes("f"))
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    if (type === "string")
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    if (type === "enum")
      return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
    return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  };

  return (
    <div className="flex items-center space-x-1">
      <Badge
        variant="outline"
        className={`text-xs ${getTypeColor(field.type)}`}
      >
        {field.type}
      </Badge>
      {field.isArray && (
        <Badge variant="outline" className="text-xs">
          Array
        </Badge>
      )}
      {field.isOptional && (
        <Badge variant="secondary" className="text-xs">
          Optional
        </Badge>
      )}
    </div>
  );
};

const ValidationInfo = ({ field }: { field: FieldMetadata }) => {
  if (!field.validation) return null;

  const validationRules = [];
  if (field.validation.required) validationRules.push("Required");
  if (field.validation.min !== undefined)
    validationRules.push(`Min: ${field.validation.min}`);
  if (field.validation.max !== undefined)
    validationRules.push(`Max: ${field.validation.max}`);
  if (field.validation.pattern) validationRules.push("Pattern validation");

  if (validationRules.length === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 text-blue-500 cursor-help" />
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">Validation Rules:</p>
            {validationRules.map((rule, index) => (
              <p key={index} className="text-xs">
                • {rule}
              </p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const DynamicFormField: React.FC<DynamicFormFieldProps> = ({
  field,
  value,
  onChange,
  disabled = false,
  error,
  showExample = false,
}) => {
  const [showPassword, setShowPassword] = useState(true);
  const [focused, setFocused] = useState(false);

  const handleChange = (newValue: any) => {
    if (newValue === "" || newValue === null || newValue === undefined) {
      if (field.isOptional) {
        onChange(undefined);
        return;
      }

      // Provide defaults for required fields
      const defaults = {
        u8: 0,
        u16: 0,
        u32: 0,
        u64: 0,
        i8: 0,
        i16: 0,
        i32: 0,
        i64: 0,
        f32: 0,
        f64: 0,
        boolean: false,
      };

      onChange(defaults[field.type as keyof typeof defaults] || "");
      return;
    }

    // Type conversion
    if (["u8", "u16", "u32", "i8", "i16", "i32"].includes(field.type)) {
      const parsed = parseInt(newValue, 10);
      onChange(isNaN(parsed) ? 0 : parsed);
    } else if (["u64", "i64"].includes(field.type)) {
      try {
        onChange(BigInt(newValue));
      } catch {
        onChange(0n);
      }
    } else if (["f32", "f64"].includes(field.type)) {
      const parsed = parseFloat(newValue);
      onChange(isNaN(parsed) ? 0 : parsed);
    } else if (field.type === "boolean") {
      onChange(Boolean(newValue));
    } else {
      onChange(newValue);
    }
  };

  const getDisplayValue = () => {
    if (value === null || value === undefined) return "";
    if (["u64", "i64"].includes(field.type)) {
      return typeof value === "bigint" ? value.toString() : String(value);
    }
    return String(value);
  };

  const renderFieldHeader = () => (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-2">
        <FieldIcon inputType={field.inputType} type={field.type} />
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {field.displayName}
          {!field.isOptional && <span className="text-red-500 ml-1">*</span>}
        </label>
        <ValidationInfo field={field} />
      </div>
      <TypeBadge field={field} />
    </div>
  );

  const commonProps = {
    disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    className: cn(
      "transition-all duration-200",
      focused && "ring-2 ring-blue-500 ring-opacity-50",
      error && "border-red-500 focus:border-red-500",
      "focus:border-blue-500"
    ),
  };

  const renderField = () => {
    switch (field.inputType) {
      case "boolean":
        return (
          <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <Checkbox
              id={field.name}
              checked={Boolean(value)}
              onCheckedChange={onChange}
              disabled={disabled}
            />
            <label
              htmlFor={field.name}
              className="text-sm font-medium cursor-pointer"
            >
              {field.displayName}
            </label>
          </div>
        );

      case "select":
        return (
          <Select
            value={value || ""}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger className={commonProps.className}>
              <SelectValue
                placeholder={`Select ${field.displayName.toLowerCase()}`}
              />
            </SelectTrigger>
            <SelectContent>
              {field.enumValues?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  <div className="flex items-center space-x-2">
                    <span>{option}</span>
                    <Badge variant="outline" className="text-xs">
                      {option}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "textarea":
        return (
          <Textarea
            value={getDisplayValue()}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Enter ${field.displayName.toLowerCase()}`}
            rows={4}
            {...commonProps}
          />
        );

      case "password":
        return (
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={getDisplayValue()}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={`Enter ${field.displayName.toLowerCase()}`}
              {...commonProps}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        );

      case "number":
        return (
          <Input
            type="number"
            value={getDisplayValue()}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Enter ${field.displayName.toLowerCase()}`}
            min={field.validation?.min}
            max={field.validation?.max}
            step={field.type.includes("f") ? "0.01" : "1"}
            {...commonProps}
          />
        );

      case "email":
        return (
          <Input
            type="email"
            value={getDisplayValue()}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Enter ${field.displayName.toLowerCase()}`}
            pattern={field.validation?.pattern}
            {...commonProps}
          />
        );

      case "url":
        return (
          <Input
            type="url"
            value={getDisplayValue()}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Enter ${field.displayName.toLowerCase()}`}
            pattern={field.validation?.pattern}
            {...commonProps}
          />
        );

      case "date":
        return (
          <Input
            type="datetime-local"
            value={getDisplayValue()}
            onChange={(e) => handleChange(e.target.value)}
            {...commonProps}
          />
        );

      default:
        return (
          <Input
            type="text"
            value={getDisplayValue()}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`Enter ${field.displayName.toLowerCase()}`}
            pattern={field.validation?.pattern}
            {...commonProps}
          />
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      {renderFieldHeader()}
      {renderField()}

      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-center space-x-2 text-red-600 dark:text-red-400"
        >
          <AlertCircle className="h-4 w-4" />
          <span className="text-xs">{error}</span>
        </motion.div>
      )}

      {showExample && field.enumValues && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">Available values:</span>{" "}
          {field.enumValues.slice(0, 3).join(", ")}
          {field.enumValues.length > 3 && "..."}
        </div>
      )}
    </motion.div>
  );
};
