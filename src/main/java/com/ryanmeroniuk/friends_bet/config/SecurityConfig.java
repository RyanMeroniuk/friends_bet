package com.ryanmeroniuk.friends_bet.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class SecurityConfig {

     @Bean
    public PasswordEncoder passwordEncoder(){

         return new BCryptPasswordEncoder();
     }
}
