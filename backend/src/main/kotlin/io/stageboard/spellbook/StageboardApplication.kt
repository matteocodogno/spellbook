package io.stageboard.spellbook

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class StageboardApplication

fun main(args: Array<String>) {
    runApplication<StageboardApplication>(*args)
}
