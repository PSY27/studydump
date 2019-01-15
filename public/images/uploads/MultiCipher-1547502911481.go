package main

import (
	"os"
    "fmt"
	"flag"
    "strings"
)

func caesar(r rune, shift int) rune {
	if (int(r)>='A') && (int(r)<='Z') {
		return rune(((int(r)-'A')+26+shift)%26+'A')
	} else if (int(r)>='a') && (int(r)<='z') {
		return rune(((int(r)-'a')+26+shift)%26+'a')
	}
	return r
}
func affine(r rune, coeff_a int, coeff_b int) rune {
	if (int(r)>='A') && (int(r)<='Z') {
		return rune((coeff_a*(int(r)-'A')+26+coeff_b)%26+'A')
	} else if (int(r)>='a') && (int(r)<='z') {
		return rune((coeff_a*(int(r)-'a')+26+coeff_b)%26+'a')
	}
	return r
}
func atbash(r rune) rune {
	if (int(r)>='A') && (int(r)<='Z') {
		return rune((26-(int(r)-'A'))+'A')
	} else if (int(r)>='a') && (int(r)<='z') {
		return rune((25-(int(r)-'a'))+'a')
	}
	return r
}
func baconian(feed, pattern string) string {
	var codes = map[string]string{
		"a": "AAAAA", "b": "AAAAB", "c": "AAABA", "d": "AAABB", "e": "AABAA", "f": "AABAB", "g": "AABBA", "h": "AABBB", "i": "ABAAA",
		"j": "ABAAB", "k": "ABABA", "l": "ABABB", "m": "ABBAA", "n": "ABBAB", "o": "ABBBA", "p": "ABBBB", "q": "BAAAA", "r": "BAAAB",
		"s": "BAABA", "t": "BAABB", "u": "BABAA", "v": "BABAB", "w": "BABBA", "x": "BABBB", "y": "BBAAA", "z": "BBAAB", " ": "BBBAA",

		"AAAAA": "a", "AAAAB": "b", "AAABA": "c", "AAABB": "d", "AABAA": "e", "AABAB": "f", "AABBA": "g", "AABBB": "h", "ABAAA": "i",
		"ABAAB": "j", "ABABA": "k", "ABABB": "l", "ABBAA": "m", "ABBAB": "n", "ABBBA": "o", "ABBBB": "p", "BAAAA": "q", "BAAAB": "r",
		"BAABA": "s", "BAABB": "t", "BABAA": "u", "BABAB": "v", "BABBA": "w", "BABBB": "x", "BBAAA": "y", "BBAAB": "z", "BBBAA": " ",
	}
	var et []byte
	var em []byte
	
	message := strings.ToLower(feed)
	text := strings.ToLower(pattern)
	
	for _, char := range message {
		if char >= 97 || char <= 122 {
			et = append(et, []byte(codes[string(char)])...)
		} else {
			et = append(et, []byte(codes[" "])...)
		}
	}

	var count int
	for _, char := range text {
		if char >= 97 && char <= 122 {
			if et[count] == 65 {
				em = append(em, byte(char))
			} else {
				em = append(em, byte(char-32))
			}
			count++
			if count == len(et) {
				break
			}
		} else {
			em = append(em, byte(char))
		}
	}

	return string(em)
}

func main() {
	var cipher, pattern string
	var shift, coeff_a, coeff_b int
	flag.StringVar(&cipher, "cipher", "", "Select cipher")
	flag.IntVar(&shift, "shift", 0, "Shift value")
	flag.StringVar(&pattern, "pattern", "defaultPattern", "Select message encoding pattern")
	flag.IntVar(&coeff_a, "coeffa", 0, "Coeffecient 'a' of ax+b")
	flag.IntVar(&coeff_b, "coeffb", 0, "Coeffecient 'b' of ax+b")
	flag.Parse()
	input:=flag.Arg(0)

	if flag.NArg() == 0 {
		flag.Usage()
		os.Exit(1)
	} else {
		if (strings.Compare(cipher,"caesar")==0) {
			result := strings.Map(func(r rune) rune {
				return caesar(r, shift)
			}, input)
			fmt.Println(result)
		} else if (strings.Compare(cipher,"affine")==0) {
			result := strings.Map(func(r rune) rune {
				return affine(r, coeff_a, coeff_b)
			}, input)
			fmt.Println(result)
		} else if (strings.Compare(cipher,"atbash")==0) {
			result := strings.Map(func(r rune) rune {
				return atbash(r)
			}, input)
			fmt.Println(result)
		} else if (strings.Compare(cipher,"baconian")==0) {
			result := baconian(input, pattern)
			fmt.Println(result)
		}
	}
}