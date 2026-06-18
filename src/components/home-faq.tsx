import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "기존에 운영하던 프로그램도 옮길 수 있나요?",
    answer:
      "네. 주차별 프로그램, 세션 설명, 운동 콘텐츠를 정리해 기존 노하우를 앱 안에서 운영할 수 있는 구조로 옮길 수 있습니다.",
  },
  {
    question: "회원들이 앱 사용을 어려워하지 않을까요?",
    answer:
      "회원은 프로그램 확인, 운동 기록 입력, 피드백 작성처럼 필요한 동작만 따라가면 됩니다. 복잡한 관리자 기능은 코치 화면에 분리됩니다.",
  },
  {
    question: "피드백을 매번 메신저로 확인하지 않아도 되나요?",
    answer:
      "네. 회원 피드백과 미답변 항목을 한곳에서 모아볼 수 있어 하루에 한 번만 확인해도 놓치는 소통을 줄일 수 있습니다.",
  },
  {
    question: "결제나 멤버십 관리도 가능한가요?",
    answer:
      "프로그램 신청, 멤버십 부여, 결제, 할인 코드 흐름을 함께 관리할 수 있도록 구성합니다.",
  },
  {
    question: "하이록스 외 다른 운동 프로그램에도 쓸 수 있나요?",
    answer:
      "가능합니다. 근력, 컨디셔닝, 러닝, 팀 트레이닝처럼 반복 운영되는 코칭 프로그램이라면 같은 구조로 활용할 수 있습니다.",
  },
  {
    question: "브랜드 로고나 코치 정보도 반영할 수 있나요?",
    answer:
      "네. 코치 프로필, 브랜드 정보, 지점, 오프라인 클래스, 공지와 콘텐츠를 함께 구성해 코칭 브랜드처럼 보이도록 운영할 수 있습니다.",
  },
] as const;

interface HomeFaqProps {
  id?: string;
}

function HomeFaq({ id }: HomeFaqProps) {
  return (
    <section id={id} className="scroll-mt-24 py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <h2 className="text-4xl font-semibold tracking-tight lg:text-5xl">
            FAQ
          </h2>
          <p className="mt-4 text-muted-foreground lg:text-lg">
            코칭 프로그램을 운영하기 전에 가장 많이 궁금해하는 내용을
            정리했습니다.
          </p>
        </div>
        <Accordion
          type="single"
          collapsible
          defaultValue="faq-0"
          className="mx-auto max-w-3xl"
        >
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`faq-${index}`}>
              <AccordionTrigger className="text-base font-semibold sm:text-lg">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-base leading-7 text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export { HomeFaq };
