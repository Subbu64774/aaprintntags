package com.salesapp.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

@Component
@Order(Integer.MIN_VALUE)
public class RequestLoggingFilter implements Filter {

    private static final String REQUEST_ID = "requestId";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        String uuid = UUID.randomUUID().toString();
        MDC.put(REQUEST_ID, uuid); // Add UUID to logging context

        if (response instanceof HttpServletResponse) {
            ((HttpServletResponse) response).setHeader("X-Request-ID", uuid); // Expose UUID in response
        }

        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(REQUEST_ID); // Prevent memory leaks in async contexts
        }
    }
}