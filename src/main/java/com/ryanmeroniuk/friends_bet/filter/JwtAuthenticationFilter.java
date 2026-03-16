package com.ryanmeroniuk.friends_bet.filter;

import com.ryanmeroniuk.friends_bet.service.TokenDenyListService;
import com.ryanmeroniuk.friends_bet.service.UserDetailsService;
import com.ryanmeroniuk.friends_bet.util.JwtUtil;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final TokenDenyListService tokenDenyList;

    public JwtAuthenticationFilter(JwtUtil jwtUtil,
                                   UserDetailsService uds,
                                   TokenDenyListService tokenDenyList) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = uds;
        this.tokenDenyList = tokenDenyList;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.equals("/api/users/register")
                || path.equals("/api/users/login")
                || path.equals("/api/users/refresh")
                || path.equals("/api/users/logout")
                || path.startsWith("/h2-console");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain)
            throws ServletException, IOException {

        String authHeader = req.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                Claims claims = jwtUtil.parseAndValidate(token);
                String tokenType = claims.get("token_type", String.class);
                if (!"access".equals(tokenType)) {
                    chain.doFilter(req, res);
                    return;
                }

                // Reject denied (logged-out) access tokens
                String jti = claims.getId();
                if (jti != null && tokenDenyList.isDenied(jti)) {
                    chain.doFilter(req, res);
                    return;
                }

                String username = claims.getSubject();
                var userDetails = userDetailsService.loadUserByUsername(username);
                var auth = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception e) {
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(req, res);
    }
}
