import { Injectable, NotFoundException } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import RefreshToken from './entities/refresh-token.entity';
import { Auth, google } from 'googleapis';

@Injectable()
export class AuthService {
  private refreshTokens: RefreshToken[] = [];
  private oauthClient: Auth.OAuth2Client;
  constructor(private readonly userService: UsersService) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.oauthClient = new google.auth.OAuth2(clientId, clientSecret);
  }

  async loginGoogleUser(
    token: string,
    values: { userAgent: string; ipAddress: string },
  ): Promise<{ accessToken: string; refreshToken: string } | undefined> {
    const tokenInfo = await this.oauthClient.getTokenInfo(token);
    console.log(token);
    console.log(tokenInfo);
    const user = await this.userService.findByEmail(tokenInfo.email);
    if (user) {
      return this.newRefreshAndAccessToken(user, values);
    }
    return undefined;
  }

  async refresh(refreshStr: string): Promise<string | undefined> {
    const refreshToken = await this.retrieveRefreshToken(refreshStr);
    if (!refreshToken) {
      return undefined;
    }

    const user = await this.userService.findOne(refreshToken.userId);
    if (!user) {
      return undefined;
    }

    const accessToken = {
      userId: refreshToken.userId,
    };

    return sign(accessToken, process.env.ACCESS_SECRET, { expiresIn: '1h' });
  }

  private retrieveRefreshToken(
    refreshStr: string,
  ): Promise<RefreshToken | undefined> {
    try {
      const decoded = verify(refreshStr, process.env.REFRESH_SECRET);
      if (typeof decoded === 'string') {
        return undefined;
      }
      return Promise.resolve(
        this.refreshTokens.find(
          (token: RefreshToken) => token.id === decoded.id,
        ),
      );
    } catch (error) {
      return undefined;
    }
  }

  async login(
    email: string,
    password: string,
    values: { userAgent: string; ipAddress: string },
  ): Promise<{ accessToken: string; refreshToken: string } | undefined> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      return undefined;
    }

    // Verify you user -- bycrypt for password hashing
    if (user.password !== password) {
      return undefined;
    }

    return this.newRefreshAndAccessToken(user, values);
  }

  private async newRefreshAndAccessToken(
    user: User,
    values: { userAgent: string; ipAddress: string },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshObject = new RefreshToken({
      id:
        this.refreshTokens.length === 0
          ? 0
          : this.refreshTokens[this.refreshTokens.length - 1].id + 1,
      ...values,
      userId: user.id,
    });
    this.refreshTokens.push(refreshObject);

    return {
      refreshToken: refreshObject.sign(),
      accessToken: sign(
        {
          userId: user.id,
        },
        process.env.ACCESS_SECRET,
        {
          expiresIn: '1h',
        },
      ),
    };
  }

  async logout(refreshStr: string): Promise<void> {
    const refreshToken = await this.retrieveRefreshToken(refreshStr);

    if (!refreshToken) {
      return;
    }
    // Delete refreshtoken from DB
    this.refreshTokens = this.refreshTokens.filter(
      (refreshToken: RefreshToken) => refreshToken.id !== refreshToken.id,
    );
  }
}
