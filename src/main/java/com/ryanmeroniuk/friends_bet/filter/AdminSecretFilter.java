package com.ryanmeroniuk.friends_bet.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class AdminSecretFilter extends OncePerRequestFilter {

    private final String adminSecret;

    public AdminSecretFilter(@Value("${admin.secret:}") String adminSecret) {
        this.adminSecret = adminSecret == null ? "" : adminSecret;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/admin/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (adminSecret.isBlank()) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Admin endpoints are disabled");
            return;
        }

        String header = request.getHeader("X-Admin-Secret");
        if (header == null || header.isBlank() || !adminSecret.equals(header)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Invalid admin secret");
            return;
        }

        filterChain.doFilter(request, response);
    }
}

