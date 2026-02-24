import type { TrainingAppData } from "@/types/training";

export const trainingData: TrainingAppData = {
  teamInfo: {
    name: "Assist On",
    slogan: "Best Hyrox Team",
    description:
      "기록만을 위한 팀이 아니라, 서로의 동기를 켜고 끝까지 실행할 수 있도록 돕는 팀",
    coreMessage: [
      "왜 이 훈련을 진행하는지 함께 고민하는 팀",
      "레이스 중에도 스스로 이유를 판단할 수 있는 팀",
      "같은 속도보다 순간을 대하는 태도를 바탕으로 정리된 '기준'을 품는 팀",
    ],
  },
  coach: {
    name: "정원준",
    instagram: "no.1_joon",
    career: [
      "하이록스 프로 싱글 한국인 신기록",
      "아디다스 하이록스 애슬릿",
      "Xon 트레이닝 헤드코치",
      "하이록스 프로 더블 아시아 신기록 (2025)",
    ],
  },
  philosophy: {
    motivation: "Motivation On",
    assistMeaning: "끝까지 실행할 수 있도록 돕는 Assist On",
    goal: "하이록스를 완주하는 사람이 아니라 레이스를 이해하고 실행하는 선수로 성장",
    values: [
      "마지막까지 버틸 줄 아는 사람",
      "기준을 지키려는 사람",
      "긍정의 에너지를 더하는 사람",
    ],
    identity: "경쟁을 부추기는 팀이 아니라 성장을 함께 만들어가는 팀",
  },
  mindset: {
    title: "Team Assist On MindSet",
    statement:
      "혼자라면 누구나 흔들릴 수 있지만, 함께라면 기준을 다시 붙잡을 수 있다고 믿는다.",
  },
  benefits: [
    "아디다스 제품 지원",
    "훈련 시 어메이즈핏 워치 사용",
    "팀 훈련 시 보충제 제공",
  ],
  trainingProgram: [
    {
      title: "Hyrox 시즌 트레이닝",
      details: ["러닝 + 워크아웃 통합 프로그램", "레이스 구간별 훈련 설계"],
    },
    {
      title: "정기 팀 세션 & 시뮬레이션",
      details: [
        "HYROX 레이스 흐름 재현",
        "피로 상황에서의 판단 훈련",
        "팀 단위 러닝 & 워크아웃 세션",
      ],
    },
    {
      title: "피드백 & 커뮤니케이션",
      details: [
        "훈련 의도 및 방향성 공유",
        "레이스 전략 정리",
        "서로의 훈련 과정에 대한 피드백",
      ],
    },
  ],
  period: {
    startDate: "2026-02-11",
    endDate: "2026-05-13",
  },
  sessions: [
    {
      date: "2026-02-24",
      week: 3,
      day: "Tuesday",
      title: "3주차 화요일 운동",
      workout: {
        warmup: {
          type: "running",
          paces: ["5:30", "5:20", "5:10", "5:00", "4:50"],
        },
        mainSet: {
          type: "running",
          distance: "400m",
          pace: "3:30",
          repetitions: 10,
        },
      },
    },
  ],
};
