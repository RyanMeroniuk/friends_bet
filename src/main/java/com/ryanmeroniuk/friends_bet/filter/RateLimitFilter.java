package com.ryanmeroniuk.friends_bet.filter;

import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Rate limits auth endpoints (login, register, refresh) per IP per minute.
 * Configurable via app.rate-limit.requests-per-minute (default: 10).
 * Set to 0 to disable rate limiting.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);
    private static final int MAX_BUCKETS = 10_000;

    /** LRU-evicting map: oldest entries are removed when the map exceeds MAX_BUCKETS. */
    @SuppressWarnings("serial")
    private final Map<String, Bucket> buckets = new LinkedHashMap<>(128, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, Bucket> eldest) {
            return size() > MAX_BUCKETS;
        }
    };

    private final int requestsPerMinute;

    public RateLimitFilter(
            @Value("${app.rate-limit.requests-per-minute:10}") int requestsPerMinute) {
        this.requestsPerMinute = requestsPerMinute;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (requestsPerMinute <= 0) return true;
        String path = request.getRequestURI();
        return !path.equals("/api/users/login")
                && !path.equals("/api/users/register")
                && !path.equals("/api/users/refresh");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String ip = request.getRemoteAddr();
        Bucket bucket;
        synchronized (buckets) {
            bucket = buckets.computeIfAbsent(ip, k -> createBucket());
        }

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            log.warn("Rate limit exceeded for IP {} on {}", ip, request.getRequestURI());
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Too many requests. Try again later.\"}");
        }
    }

    private Bucket createBucket() {
        return Bucket.builder()
                .addLimit(limit -> limit.capacity(requestsPerMinute)
                        .refillGreedy(requestsPerMinute, Duration.ofMinutes(1)))
                .build();
    }
}
