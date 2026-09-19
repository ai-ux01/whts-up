import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  workspaceName!: string;
}

export class RefreshTokenDto {
  // Optional: the refresh token is normally read from the httpOnly cookie.
  // Kept as an optional body field for backward compatibility / non-browser clients.
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
