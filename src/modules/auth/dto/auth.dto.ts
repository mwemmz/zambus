import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;
export const PASSWORD_MESSAGE =
  'password must be at least 8 characters and contain both a letter and a number';

/** Reusable password field definition so every endpoint applies the same policy. */
export class PasswordField {
  @IsString()
  @MinLength(8)
  @MaxLength(72, { message: 'password must be at most 72 characters (bcrypt limit)' })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password!: string;
}

export class RegisterDto extends PasswordField {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  fullName!: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+260|0)\d{9}$/, {
    message: 'phone must be a Zambian number, e.g. 0971234567 or +260971234567',
  })
  phone?: string;
}

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'email must be a valid email address' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'password is required' })
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  @MinLength(10)
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'email must be a valid email address' })
  email!: string;
}

export class ResetPasswordDto extends PasswordField {
  @IsString()
  @MinLength(10)
  token!: string;
}

export class ChangePasswordDto extends PasswordField {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  fullName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+260|0)\d{9}$/, {
    message: 'phone must be a Zambian number, e.g. 0971234567 or +260971234567',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  nationalId?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+260|0)\d{9}$/, {
    message: 'emergencyContactPhone must be a Zambian number',
  })
  emergencyContactPhone?: string;
}
